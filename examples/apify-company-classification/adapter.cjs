'use strict';
// Pure adapter logic. No network, credentials, or model calls.
const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED']);
function fail(code) { throw new Error(code); }
function text(value, max, code) {
  if (typeof value !== 'string' || !value.trim() || Buffer.byteLength(value, 'utf8') > max) fail(code);
  return value;
}
function plan(c) {
  if (c.executeModelCalls !== true) fail('EXECUTION_DISABLED: read README, select credentials, review budget, then enable explicitly');
  if (!Array.isArray(c.records) || c.records.length < 1 || c.records.length > 1000) fail('RECORD_LIMIT_1_TO_1000');
  const labels = c.labels ?? [], fields = c.fields ?? [];
  for (const [values, max] of [[labels, 20], [fields, 10]]) {
    if (!Array.isArray(values) || values.length > max) fail('TASK_FIELDS');
    values.forEach(v => text(v, 120, 'TASK_FIELD_BYTES'));
    if (new Set(values).size !== values.length) fail('DUPLICATE_TASK_FIELD');
  }
  if (!labels.length && !fields.length) fail('EMPTY_TASK');
  const seen = new Set();
  const items = c.records.map((r) => {
    // Deliberately explicit mapping: no accidental use of a personal profile or email.
    const id = text(r.id, 100, 'ID_MUST_BE_UNIQUE_STRING_MAX_100_BYTES');
    if (seen.has(id)) fail('DUPLICATE_ID');
    seen.add(id);
    return {id, text: text(r.text, 8000, 'TEXT_MISSING_OR_OVER_8000_BYTES')};
  });
  const cap = c.perRunCapUsd, total = c.totalCapUsd;
  if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(total) || total <= 0) fail('INVALID_BUDGET');
  const chunks = [];
  for (let i = 0; i < items.length; i += 20) chunks.push(items.slice(i, i + 20));
  if (chunks.length * cap > total + 1e-9) fail('BUDGET_TOO_SMALL_FOR_ALL_RUN_CAPS');
  if (typeof c.build !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(c.build)) fail('BUILD_REQUIRED');
  return {chunks, labels, fields, perRunCapUsd: cap, totalCapUsd: total, build: c.build,
    batchIndex: 0, reports: [], canContinue: true,
    input: {items: chunks[0], labels, fields, includeSourceText: false}};
}
function responseBody(r) {
  if (!r || !Number.isInteger(r.statusCode) || r.statusCode < 200 || r.statusCode >= 300) fail('HTTP_NOT_SUCCESSFUL: inspect execution; do not resubmit an uncertain POST');
  return r.body;
}
function remember(s, response, now = Date.now()) {
  const run = responseBody(response)?.data;
  if (!run || !/^[a-zA-Z0-9]{5,80}$/.test(run.id ?? '') || !/^[a-zA-Z0-9]{5,80}$/.test(run.defaultDatasetId ?? '')) fail('RUN_RESPONSE_INVALID: inspect Apify Runs before any resubmission');
  return {...s, runId: run.id, datasetId: run.defaultDatasetId, deadline: now + 300000, terminal: false};
}
function inspect(s, response, now = Date.now()) {
  const run = responseBody(response)?.data;
  if (!run || run.id !== s.runId || run.defaultDatasetId !== s.datasetId) fail('RUN_IDENTITY_MISMATCH');
  if (typeof run.status !== 'string') fail('MISSING_RUN_STATUS');
  if (!TERMINAL.has(run.status) && now > s.deadline) fail('POLL_DEADLINE: inspect saved runId; no automatic resubmission');
  if (!TERMINAL.has(run.status) && !['READY','RUNNING','TIMING-OUT','ABORTING'].includes(run.status)) fail('UNKNOWN_RUN_STATUS');
  return {...s, runStatus: run.status, terminal: TERMINAL.has(run.status)};
}
function reconcile(s, response) {
  if (!s.terminal) fail('NONTERMINAL_DATASET_READ');
  const rows = responseBody(response);
  if (!Array.isArray(rows)) fail('DATASET_NOT_ARRAY');
  const expected = new Set(s.input.items.map(x => x.id));
  const byId = new Map();
  const anomalies = [];
  for (const row of rows) {
    if (!row || !expected.has(row.id)) { anomalies.push('UNEXPECTED_OUTPUT_ID'); continue; }
    if (byId.has(row.id)) { anomalies.push('DUPLICATE_OUTPUT_ID'); continue; }
    byId.set(row.id, row);
  }
  const results = s.input.items.map(item => {
    const row = byId.get(item.id);
    if (!row) return {id: item.id, status: 'MISSING_OUTPUT', needsReview: true, semanticCorrectnessVerified: false, runId: s.runId};
    // Keep the Actor's output. Structure validation is not semantic verification or payment evidence.
    return {...row, id: item.id, runId: s.runId, semanticCorrectnessVerified: false};
  });
  const complete = s.runStatus === 'SUCCEEDED' && !anomalies.length && results.every(r => r.status === 'STRUCTURE_VALIDATED');
  const report = {batchIndex: s.batchIndex, runId: s.runId, datasetId: s.datasetId,
    runStatus: s.runStatus, complete, anomalies, results};
  const reports = [...s.reports, report];
  const batchIndex = s.batchIndex + 1;
  const canContinue = complete && batchIndex < s.chunks.length;
  return {...s, reports, batchIndex, canContinue,
    input: canContinue ? {items: s.chunks[batchIndex], labels: s.labels, fields: s.fields, includeSourceText: false} : null};
}
function finish(s) {
  const returned = s.reports.flatMap(r => r.results);
  const notSubmitted = s.chunks.slice(s.batchIndex).flat().map(r => ({id: r.id, status: 'NOT_SUBMITTED_AFTER_STOP', needsReview: true, semanticCorrectnessVerified: false}));
  const results = [...returned, ...notSubmitted];
  return {status: s.reports.every(r => r.complete) && !notSubmitted.length ? 'COMPLETED_STRUCTURE_CHECK_ONLY' : 'STOPPED_REVIEW_REQUIRED',
    submittedRuns: s.reports.length, inputRecords: s.chunks.flat().length,
    structureValidated: results.filter(r => r.status === 'STRUCTURE_VALIDATED').length,
    missing: results.filter(r => r.status === 'MISSING_OUTPUT').length,
    notSubmitted: notSubmitted.length,
    paidResults: null, semanticAccuracy: null, actualChargeUsd: null,
    runCapSumUsd: s.reports.length * s.perRunCapUsd,
    runs: s.reports.map(({results, ...report}) => report), results};
}
module.exports = {plan, remember, inspect, reconcile, finish};
