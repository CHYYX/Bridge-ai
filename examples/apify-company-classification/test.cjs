'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {plan,remember,inspect,reconcile,finish} = require('./adapter.cjs');
let tests=0;
function check(name, fn) {fn(); tests++; console.log('PASS '+name);}
const cfg = n => ({executeModelCalls:true,build:'live-candidate',perRunCapUsd:.05,totalCapUsd:5,
 labels:['manufacturer'],fields:[],records:Array.from({length:n},(_,i)=>({id:'id-'+i,text:'Example manufactures valves.'}))});
const run = (id='Run12345',status='RUNNING') => ({statusCode:200,body:{data:{id,defaultDatasetId:'Dataset12345',status}}});
const dataset = rows => ({statusCode:200,body:rows});
const done = s => inspect(remember(s,run(),1000),run('Run12345','SUCCEEDED'),2000);
check('Default requires deliberate opt-in before any network node',()=>assert.throws(()=>plan({...cfg(2),executeModelCalls:false}),/EXECUTION_DISABLED/));
check('41 inputs produce 20/20/1 with stable IDs',()=>assert.deepEqual(plan(cfg(41)).chunks.map(x=>x.length),[20,20,1]));
check('UTF-8 bytes enforced without truncation',()=>{
 const c=cfg(1);c.records[0].text='中'.repeat(2667);assert.throws(()=>plan(c),/8000/);
 c.records[0].text='中'.repeat(2666);assert.equal(plan(c).chunks[0][0].text.length,2666);
});
check('Duplicate IDs fail before submission',()=>{const c=cfg(2);c.records[1].id=c.records[0].id;assert.throws(()=>plan(c),/DUPLICATE_ID/);});
check('Whole-job upper-bound budget must cover all run caps',()=>assert.throws(()=>plan({...cfg(41),totalCapUsd:.1}),/BUDGET_TOO_SMALL/));
check('Unknown POST outcome cannot create a retry state',()=>assert.throws(()=>remember(plan(cfg(1)),{statusCode:502,body:{}}),/do not resubmit/));
check('Poll identity and deadline are enforced',()=>{
 const s=remember(plan(cfg(1)),run(),1000);
 assert.throws(()=>inspect(s,run('Other12345'),2000),/IDENTITY/);
 assert.throws(()=>inspect(s,run(),301001),/DEADLINE/);
 assert.equal(inspect(s,run('Run12345','SUCCEEDED'),301001).terminal,true);
});
check('All 41 outputs survive sequential batches and reordered dataset rows',()=>{
 let s=plan(cfg(41)), i=0;
 do {s=done(s);const rows=s.input.items.map(x=>({id:x.id,status:'STRUCTURE_VALIDATED',semanticCorrectnessVerified:true})).reverse();s=reconcile(s,dataset(rows));i++;}while(s.canContinue);
 const f=finish(s);assert.equal(i,3);assert.equal(f.structureValidated,41);assert.equal(f.inputRecords,41);
 assert.deepEqual(f.results.map(x=>x.id),cfg(41).records.map(x=>x.id));assert(f.results.every(x=>x.semanticCorrectnessVerified===false));assert.equal(f.actualChargeUsd,null);
});
check('Successful run with partial dataset stops; later inputs preserved as not submitted',()=>{
 let s=done(plan(cfg(41)));s=reconcile(s,dataset([{id:'id-0',status:'STRUCTURE_VALIDATED'}]));
 const f=finish(s);assert.equal(s.canContinue,false);assert.equal(f.missing,19);assert.equal(f.notSubmitted,21);assert.equal(f.results.length,41);
});
check('Failure on second batch preserves first batch and the unsubmitted tail',()=>{
 let s=done(plan(cfg(41)));s=reconcile(s,dataset(s.input.items.map(x=>({id:x.id,status:'STRUCTURE_VALIDATED'}))));
 s=inspect(remember(s,run()),run('Run12345','FAILED'));s=reconcile(s,dataset([{id:'id-20',status:'FAILED',error:'EXAMPLE'}]));
 const f=finish(s);assert.equal(f.structureValidated,20);assert.equal(f.missing,19);assert.equal(f.notSubmitted,1);assert.equal(f.results.length,41);
});
check('Duplicate or unknown output IDs stop even with HTTP 200',()=>{
 const s=done(plan(cfg(21)));const rows=s.input.items.map(x=>({id:x.id,status:'STRUCTURE_VALIDATED'}));
 for(const bad of [{id:'id-0',status:'STRUCTURE_VALIDATED'},{id:'unknown',status:'STRUCTURE_VALIDATED'}]){
  const r=reconcile(s,dataset([...rows,bad]));assert.equal(r.canContinue,false);assert.equal(r.reports[0].complete,false);
 }
});
check('Workflow graph, code syntax, credentials and no-retry defaults',()=>{
 const w=JSON.parse(fs.readFileSync(__dirname+'/lanseq-company-classification.n8n.json','utf8'));
 const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);assert.equal(w.active,false);
 for(const outputs of Object.values(w.connections))for(const branch of outputs.main)for(const edge of branch)assert(names.has(edge.node));
 for(const node of w.nodes){
  assert.equal(node.credentials,undefined);
  if(node.type==='n8n-nodes-base.code')new Function('$input','$',node.parameters.jsCode);
  if(node.type==='n8n-nodes-base.httpRequest'){assert.equal(node.retryOnFail,false);assert.equal(node.onError,'stopWorkflow');assert.equal(node.parameters.genericAuthType,'httpHeaderAuth');}
 }
 assert.equal(w.nodes.filter(n=>n.type==='n8n-nodes-base.httpRequest'&&n.parameters.method==='POST').length,1);
});
console.log(JSON.stringify({adapterChecksPassed:tests,networkRequests:0,modelCalls:0,n8nRuntimeTestIncludedInThisCommand:false}));
