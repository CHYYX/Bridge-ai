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
add("Read before enabling",'stickyNote',1,{"width": 850, "height": 750, "color": 1, "content": "### How it works\nFor sales and data-operations teams with existing company descriptions. A manual execution validates your input, submits batches of up to 20 records to the Lanseq Apify Actor, waits for completion, and joins results by the original IDs. Final report preserves every input ID, including missing and unsubmitted rows. Failed or incomplete batches stop later submissions. This workflow does not scrape websites or find contacts.\n\n### Setup\n1. Use an n8n instance and an Apify account with access to the linked Actor. Select your existing Apify HTTP Header Auth credential on Start Actor once, Read run, and Read results. Configure authentication only in the credentials UI.\n2. In Input and budget, replace the synthetic records and labels. IDs must be unique and at most 100 UTF-8 bytes; descriptions at most 8,000 bytes. Use at most 20 labels. Do not silently truncate text.\n3. Review build 0.1.3, the Actor's current pricing, and the $0.05 per-run / $0.10 total cap defaults. The template is free; Actor execution may incur charges. Deliberately set executeModelCalls to true only after review.\n4. Start manually and inspect Final report. Text is sent to Apify and the model service; input and execution logs may retain it.\n\nn8n 2.47.7 mock-API execution was checked, including partial results. Live Apify/model end-to-end execution remains unverified. Structure validation does not establish label accuracy. Never blindly replay a failed POST: reconcile Apify Runs first.\n\n[Setup details and recovery guide](https://github.com/CHYYX/Bridge-ai/blob/lanseq-apify-n8n-20261115/examples/apify-company-classification/README.md)"},[-40, -640]);
add("Validate input and budget",'stickyNote',1,{"width": 850, "height": 500, "color": 7, "content": "## Validate input and budget\nCheck stable IDs, UTF-8 limits, labels, execution opt-in and planned spending before any network request. Replace the synthetic examples with your own descriptions."},[-40, 140]);
add("Submit once and await completion",'stickyNote',1,{"width": 1290, "height": 580, "color": 7, "content": "## Submit once and await completion\nOne run at a time. Poll every 10 seconds with a five-minute deadline; polling timeout does not cancel the remote run. No automatic POST retries."},[850, 140]);
add("Preserve results and stop on gaps",'stickyNote',1,{"width": 1000, "height": 580, "color": 7, "content": "## Preserve results and stop on gaps\nJoin by original ID. A failed run, failed row, duplicate, unexpected or missing output stops further batches. Final report retains earlier results and marks missing or unsubmitted rows. Structure validation is not semantic accuracy."},[2160, 140]);
for(const [a,b,branch] of [
 ['Manual start','Input and budget'],['Input and budget','Validate and plan'],['Validate and plan','Current batch'],
 ['Current batch','Start Actor once'],['Start Actor once','Remember run'],['Remember run','Poll context'],
 ['Poll context','Read run'],['Read run','Inspect run'],['Inspect run','Run terminal'],
 ['Run terminal','Read results',0],['Run terminal','Wait 10 seconds',1],['Wait 10 seconds','Poll context'],
 ['Read results','Reconcile batch'],['Reconcile batch','Continue batches'],['Continue batches','Current batch',0],['Continue batches','Final report',1]
]) link(a,b,branch??0);
const workflow={name:'Lanseq — classify supplied company descriptions in batches',active:false,nodes,connections,
  settings:{executionOrder:'v1',saveManualExecutions:true},pinData:{},tags:[]};
fs.writeFileSync(__dirname+'/lanseq-company-classification.n8n.json',JSON.stringify(workflow,null,2)+'\n');
console.log(`Wrote inactive workflow: ${nodes.length} nodes; three credential-bound HTTP nodes; no credentials exported.`);
