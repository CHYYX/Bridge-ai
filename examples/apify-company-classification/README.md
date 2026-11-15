# Lanseq: company descriptions → custom business labels

[Download the workflow JSON](./lanseq-company-classification.n8n.json?raw=1) · [Try the Apify example](https://apify.com/everlasting_circlet/my-actor/examples/classify-manufacturers-distributors-and-software-firms)

An importable n8n workflow for the existing public Lanseq Actor. It accepts supplied text, splits it into runs of at most 20 records, waits for each run, joins results by ID, and stops if a batch fails or returns incomplete output.

**Validation status:** imported and executed with n8n 2.47.7 against an isolated localhost mock API. A 41-record input completed three batches; a second scenario stopped after partial output, retained earlier results and marked unsubmitted records. Twelve adapter checks also pass. The live Apify/model end-to-end path was not exercised by these tests. No production inference or paid requests were made. This is not an officially certified n8n template or a model-quality benchmark. See [runtime evidence](./runtime-evidence.json).

## Product

- [Open the classification example](https://apify.com/everlasting_circlet/my-actor/examples/classify-manufacturers-distributors-and-software-firms)
- Classification: $0.98 per 1,000 stored, structurally validated results at the reviewed public price. Check the Actor pricing tab before running. This is not a guarantee that a label is correct.
- Free-plan evaluation: 10 model requests in total per account, not per day and not 10 runs. Requests that fail can still consume an evaluation allowance.
- The Actor operates on supplied text. It does not visit websites, scrape LinkedIn, or enrich missing descriptions itself.
- Maximum 20 records per Actor run; text ≤8,000 UTF-8 bytes per record; ID ≤100 bytes; ≤20 labels, ≤10 extraction fields, each ≤120 bytes.
- No separate model-provider API key is needed. API use still requires the user's existing Apify authentication.

## Import and configure

1. Import `lanseq-company-classification.n8n.json` in n8n. The workflow is inactive, has only a manual trigger, and `executeModelCalls` defaults to `false`.
2. In n8n, select an existing HTTP Header Auth credential on **Start Actor once**, **Read run**, and **Read results**. The header is `Authorization` and its value uses the user's own existing Apify bearer token. Configure it privately in the credentials UI. Do not put a token in this file, a query string, email, chat, or shared workflow export. This package contains no credentials and does not generate any.
3. Replace the two synthetic records in **Input and budget** with your supplied business descriptions. Keep `id` stable and unique. These examples are not quality evidence.
4. Review the Actor's currently published build and prices. The template pins Apify build `0.1.3`, verified in the Actor's console on 2026-11-15. The source's separate `0.1.3-public` string is an application version; it was not used to infer the build number. Change the pin only after reviewing a later build.
5. Review `perRunCapUsd` and `totalCapUsd`. Defaults are $0.05 per run and $0.10 across the planned run caps. The workflow refuses to start if the sum of all planned run caps exceeds the total. These are maximum-charge settings, not price quotes, reserved funds, or confirmed invoices. Existing account limits and plan eligibility still apply. A low cap can stop a run early; partial output is reported.
6. Check n8n's input, execution-log retention and credentials permissions. Source text is sent to Apify and the model service; the Actor INPUT and n8n execution data may retain it. `includeSourceText:false` removes the full source from output rows only; returned evidence spans still contain source text.
7. After reviewing these settings, deliberately set `executeModelCalls:true`. Start with a few public business descriptions with expected labels. Running may incur charges. Do not execute again merely because a response is slow.

## Mapping an existing scraper output

Only map the required business text and a stable ID. No new scraping is included.

| Existing output | Map to `records` |
| --- | --- |
| HarvestAPI company details | `{id: String(row.id), text: row.description}` |
| API Maestro company details | `{id: stableCompanyId, text: row.basic_info.description}`; preserve the ID from your input/search result, because the documented detail sample does not guarantee one |
| Website Content Crawler | `{id: stableShortId, text: row.text}` (or deliberately choose `row.markdown`); keep URL↔ID mapping upstream |
| Your CSV or CRM export | Map one stable ID column and one business-description column |

Do not substitute a person's profile or email for missing company text. Missing/oversized text, duplicate IDs and invalid labels fail before submission. Text is never silently truncated. Select an appropriate business excerpt upstream if a page exceeds the limit. The adapter itself accepts at most 1,000 rows per manual execution to bound execution data; this does not change service limits.

## Results, failures and recovery

- `Final report.results` contains every original ID in input order, including `MISSING_OUTPUT` and `NOT_SUBMITTED_AFTER_STOP` where appropriate.
- `STRUCTURE_VALIDATED` means the Actor accepted the output structure and source spans. It is not semantic accuracy, a confirmed customer, billable-event verification, settlement, or money received. The adapter leaves accuracy and actual charges unknown.
- A non-successful Actor run, failed row, missing row, duplicate output ID or unexpected ID stops submission of subsequent chunks. Earlier results are preserved.
- `needsReview:true` may represent a valid abstention/null label. It remains visible and is not converted to an error or hidden.
- HTTP and polling failures stop the workflow. Inspect the saved execution state and Apify Runs; a final report may not exist for transport failures. The last remembered run ID is available in **Remember run** or **Poll context**. If the initial POST response was lost, find the run in Apify Console before submitting anything again.
- Automatic HTTP retry and Actor restart-on-error are disabled. A new POST creates a new run and can duplicate charges. The workflow does not implement cross-execution idempotency. Do not schedule it or replay a failed execution without reconciliation.
- Run timeout: 180 seconds. Poll interval: 10 seconds, with a five-minute deadline after acknowledgement. A polling timeout does not cancel the remote run.
- `runCapSumUsd` is only the sum of caps for acknowledged, reconciled runs. It is not actual cost. On a transport failure, inspect the platform billing/run ledger.

## Offline checks

```
node build.cjs
node test.cjs
```

The unit tests check adapter behavior: byte limits, duplicate IDs, cost caps, asynchronous run identity, bounded polling, partial results, stop behavior and output reconciliation. They do not measure inference quality.

`runtime-check.py` separately imports and runs the full workflow using an installed official n8n CLI. It rewrites the three HTTP destinations to a local mock API and removes authentication from the test copy only. It never contacts Apify. It shortens the polling delay for tests and uses synthetic records. Run with `python3 runtime-check.py /path/to/n8n/bin/n8n`. The consumer workflow retains its HTTPS destinations and credential requirements.

## Reference documentation

- https://docs.apify.com/api/v2/actors-runs-post
- https://docs.apify.com/api/v2/actor-run-get
- https://docs.apify.com/api/v2/dataset-items-get
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
- https://docs.n8n.io/build/work-with-data/transform-data/expression-reference/nodeoutputdata.md

Updated 2026-11-15. Lanseq is a multi-open-model inference provider. This example uses the capabilities and limits of the linked Apify Actor.
