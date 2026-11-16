'use strict';
const fs = require('node:fs');
const base = fs.readFileSync(__dirname + '/adapter.cjs', 'utf8').split('module.exports =')[0];
const nodes = [], connections = {};
function add(name, type, version, parameters, position, extra={}) {
  nodes.push({id: `lanseq-${nodes.length+1}`, name, type:`n8n-nodes-base.${type}`, typeVersion:version, parameters, position, ...extra});
}
function code(name, script, pos, withBase=true) { add(name,'code',2,{mode:'runOnceForAllItems',jsCode:(withBase?base+'\n':'')+script},pos); }
function link(from,to,branch=0) {
  connections[from] ??= {main:[]};
  while(connections[from].main.length<=branch) connections[from].main.push([]);
  connections[from].main[branch].push({node:to,type:'main',index:0});
}
function http(name, method, url, pos, extra={}) {
  add(name,'httpRequest',4.2,{method,url,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',
    options:{timeout:75000,redirect:{redirect:{followRedirects:false}},response:{response:{fullResponse:true,responseFormat:'json'}}},...extra},pos,
    {retryOnFail:false,onError:'stopWorkflow',notesInFlow:true,notes:'Select your own Apify Header Auth credential. No automatic retry. Never paste credentials into URL or workflow JSON.'});
}
function condition(name, expr, pos) {add(name,'if',2.2,{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:name+'-true',leftValue:expr,rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},pos);}
add('Manual start','manualTrigger',1,{},[0,300]);
code('Input and budget',`return [{json:{
  executeModelCalls: false,
  build: '0.1.3',
  perRunCapUsd: 0.05,
  totalCapUsd: 0.10,
  labels: ['manufacturer','distributor','software provider'], fields: [],
  records: [
    {id:'synthetic-001', text:'Example Alpha manufactures stainless steel valves.'},
    {id:'synthetic-002', text:'Example Beta develops accounting software.'}
  ]
}}];`,[220,300],false);
code('Validate and plan','return [{json:plan($input.first().json),pairedItem:{item:0}}];',[440,300]);
code('Current batch','return [{json:$input.first().json,pairedItem:{item:0}}];',[660,300],false);
http('Start Actor once','POST','https://api.apify.com/v2/acts/naa8BJzWLGzmD1dQP/runs',[900,300],{
  sendQuery:true,queryParameters:{parameters:[{name:'build',value:'={{ $json.build }}'},{name:'memory',value:'128'},{name:'timeout',value:'180'},{name:'restartOnError',value:'false'},{name:'maxTotalChargeUsd',value:'={{ $json.perRunCapUsd }}'}]},
  sendBody:true,specifyBody:'json',jsonBody:'={{ $json.input }}'});
code('Remember run','return [{json:remember($("Current batch").item.json,$input.first().json),pairedItem:{item:0}}];',[1120,300]);
code('Poll context','return [{json:$input.first().json,pairedItem:{item:0}}];',[1340,300],false);
http('Read run','GET',"={{ 'https://api.apify.com/v2/actor-runs/' + $json.runId }}",[1560,300]);
code('Inspect run','return [{json:inspect($("Poll context").item.json,$input.first().json),pairedItem:{item:0}}];',[1780,300]);
condition('Run terminal','={{ $json.terminal }}',[2000,300]);
add('Wait 10 seconds','wait',1.1,{amount:10,unit:'seconds'},[2000,540]);
http('Read results','GET',"={{ 'https://api.apify.com/v2/datasets/' + $json.datasetId + '/items' }}",[2220,240],{
  sendQuery:true,queryParameters:{parameters:[{name:'format',value:'json'},{name:'clean',value:'false'},{name:'limit',value:'21'}]}});
code('Reconcile batch','return [{json:reconcile($("Inspect run").item.json,$input.first().json),pairedItem:{item:0}}];',[2440,240]);
condition('Continue batches','={{ $json.canContinue }}',[2660,240]);
code('Final report','return [{json:finish($input.first().json),pairedItem:{item:0}}];',[2880,400]);
add("Start here",'stickyNote',1,{"width": 760, "height": 460, "color": 1, "content": "# Classify company descriptions with Apify\nTurn descriptions you already have into labels for lead segmentation. Supply your own categories; this workflow does not scrape websites or find contacts.\n\n## Before you start\nUse an Apify account and n8n. The workflow is free; Actor usage follows its published pricing. Read the [setup and recovery guide](https://github.com/CHYYX/Bridge-ai/blob/lanseq-apify-n8n-20261115/examples/apify-company-classification/README.md).\n\n**Validation:** orchestration checked on n8n 2.47.7 with mock responses. Live end-to-end execution and classification accuracy are not established."},[-60, -500]);
add("Configure credentials and limits",'stickyNote',1,{"width": 900, "height": 460, "color": 5, "content": "# Setup checklist\n1. In **Input and budget**, replace the synthetic records and labels. Each record needs a unique `id` and a `text` description.\n2. Select your existing Apify **HTTP Header Auth** credential on **Start Actor once**, **Read run**, and **Read results**. Keep secrets in n8n credentials, never in this JSON.\n3. Review build `0.1.3`, current Actor pricing, and caps: **$0.05/run; $0.10 total**. Caps are spending limits, not estimates.\n4. Set `executeModelCalls: true` only when ready, then run manually.\n\nText goes to Apify and Lanseq. Execution history may retain input; use data you have permission to process."},[760, -500]);
add("1. Prepare and validate",'stickyNote',1,{"width": 840, "height": 630, "color": 7, "content": "## 1. Prepare the batch plan\n**Edit Input and budget before running.** Choose labels that match your business task.\n\nValidation rejects duplicate IDs and oversized input before any HTTP call: IDs \u2264100 UTF-8 bytes, text \u22648,000 bytes, \u226420 labels and \u226410 fields.\n\nThe plan splits records into batches of **up to 20**, with one remote run at a time. Keep the original IDs to join results back to your source."},[-60, 80]);
add("2. Submit exactly once",'stickyNote',1,{"width": 460, "height": 630, "color": 4, "content": "## 2. Create one Actor run\nStart the current batch and remember the returned run and Dataset IDs.\n\n**No automatic POST retry.** If the request times out, check Apify Runs before submitting again: it may already have started and incurred charges.\n\nNever blindly replay an uncertain submission."},[830, 80]);
add("3. Wait for a terminal status",'stickyNote',1,{"width": 900, "height": 700, "color": 6, "content": "## 3. Poll without restarting\nRead the saved run every **10 seconds** until it finishes, fails or reaches the five-minute polling deadline.\n\nThe Wait node returns to Poll context, not to Start Actor once. Polling timeout **does not cancel** the remote run.\n\nCheck Apify Runs before recovery. A terminal status is not proof that every input produced a valid result."},[1340, 80]);
add("4. Reconcile every input ID",'stickyNote',1,{"width": 1020, "height": 700, "color": 3, "content": "## 4. Inspect the final report\nRead the Dataset and match rows by original ID. Continue only if the batch is complete and structurally valid.\n\nMissing, duplicate, unexpected or failed rows stop later submissions. **Final report** retains earlier results and marks missing and unsubmitted records.\n\nReview these flags before writing to a CRM or Sheet. Structural validation is not semantic accuracy; check labels against known answers."},[2290, 80]);
for(const [a,b,branch] of [
 ['Manual start','Input and budget'],['Input and budget','Validate and plan'],['Validate and plan','Current batch'],
 ['Current batch','Start Actor once'],['Start Actor once','Remember run'],['Remember run','Poll context'],
 ['Poll context','Read run'],['Read run','Inspect run'],['Inspect run','Run terminal'],
 ['Run terminal','Read results',0],['Run terminal','Wait 10 seconds',1],['Wait 10 seconds','Poll context'],
 ['Read results','Reconcile batch'],['Reconcile batch','Continue batches'],['Continue batches','Current batch',0],['Continue batches','Final report',1]
]) link(a,b,branch??0);
for (const n of nodes) { if (!n.type.endsWith('.stickyNote')) { n.position[1] += 180; if (['Read results','Reconcile batch','Continue batches','Final report'].includes(n.name)) n.position[0] += 160; }}
const workflow={name:'Lanseq — classify supplied company descriptions in batches',active:false,nodes,connections,
  settings:{executionOrder:'v1',saveManualExecutions:true},pinData:{},tags:[]};
fs.writeFileSync(__dirname+'/lanseq-company-classification.n8n.json',JSON.stringify(workflow,null,2)+'\n');
console.log(`Wrote inactive workflow: ${nodes.length} nodes; three credential-bound HTTP nodes; no credentials exported.`);
