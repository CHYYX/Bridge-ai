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
add('Read before enabling','stickyNote',1,{width:640,height:280,content:'## Lanseq company classification\nDisabled by default. Configure your own Apify Header Auth on all three HTTP nodes. Read README, review build and budget, replace synthetic input, then enable executeModelCalls.\n\nOne run at a time, 20 records/run. Partial/failed batches stop further submission. POST transport errors require manual inspection of Apify Runs before retry.\n\nn8n 2.47.7 CLI import and execution tested against a local mock API. Live Apify/model end-to-end not verified by this template test. Structure validation is not accuracy, settlement or payment evidence.'},[200,-40]);
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
