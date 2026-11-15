"""Run the exported workflow in an isolated n8n CLI against localhost only.

No Apify credentials, no production endpoints, and no inference are used.
Pass the installed official n8n bin path as argv[1].
"""
import copy, json, os, pathlib, re, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
BIN = pathlib.Path(sys.argv[1]).resolve()
ROOT = pathlib.Path(tempfile.mkdtemp(prefix='lanseq-n8n-check-'))
BASE = json.loads((HERE / 'lanseq-company-classification.n8n.json').read_text())
env = dict(os.environ, N8N_USER_FOLDER=str(ROOT/'state'), N8N_DIAGNOSTICS_ENABLED='false',
    N8N_VERSION_NOTIFICATIONS_ENABLED='false', N8N_TEMPLATES_ENABLED='false',
    N8N_LISTEN_ADDRESS='127.0.0.1', N8N_RUNNERS_BROKER_LISTEN_ADDRESS='127.0.0.1',
    N8N_RUNNERS_BROKER_PORT='15679', N8N_LOG_LEVEL='info')
evidence = []

for case in ['complete', 'partial']:
    state = {'posts': [], 'polls': {}, 'requests': 0}
    class Mock(BaseHTTPRequestHandler):
        def log_message(self, *args): pass
        def send(self, obj, code=200):
            raw=json.dumps(obj).encode();self.send_response(code)
            self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)))
            self.end_headers();self.wfile.write(raw)
        def do_POST(self):
            state['requests']+=1
            assert self.path.startswith('/v2/acts/naa8BJzWLGzmD1dQP/runs?'), self.path
            assert 'Authorization' not in self.headers
            body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            assert 1 <= len(body['items']) <= 20
            state['posts'].append(body);n=len(state['posts'])
            self.send({'data':{'id':f'Run00000{n}','defaultDatasetId':f'Dataset00000{n}','status':'RUNNING'}},201)
        def do_GET(self):
            state['requests']+=1
            if self.path.startswith('/v2/actor-runs/Run00000'):
                n=int(self.path.split('Run00000')[1]);count=state['polls'].get(n,0);state['polls'][n]=count+1
                self.send({'data':{'id':f'Run00000{n}','defaultDatasetId':f'Dataset00000{n}','status':'RUNNING' if count==0 else 'SUCCEEDED'}})
            elif self.path.startswith('/v2/datasets/Dataset00000'):
                n=int(self.path.split('Dataset00000')[1].split('/')[0]);items=state['posts'][n-1]['items']
                if case=='partial' and n==2: items=items[:1]
                self.send([{'id':v['id'],'status':'STRUCTURE_VALIDATED','label':None,'needsReview':True,'semanticCorrectnessVerified':False} for v in reversed(items)])
            else: self.send({'error':'Unexpected route'},404)
    server=ThreadingHTTPServer(('127.0.0.1',0),Mock)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    w=copy.deepcopy(BASE);w['id']='LanseqTestCase001' if case=='complete' else 'LanseqTestCase002'
    w['name']='LOCAL MOCK ONLY '+case
    config={'executeModelCalls':True,'build':'0.1.3','perRunCapUsd':.05,'totalCapUsd':.15,
        'labels':['manufacturer'],'fields':[],
        'records':[{'id':f'company-{i:03d}','text':'Synthetic company manufactures valves.'} for i in range(41)]}
    for node in w['nodes']:
        p=node['parameters']
        if node['name']=='Input and budget': p['jsCode']='return [{json:'+json.dumps(config)+'}];'
        if node['type']=='n8n-nodes-base.httpRequest':
            p['url']=p['url'].replace('https://api.apify.com',origin)
            p['authentication']='none';p.pop('genericAuthType',None);node.pop('credentials',None)
            assert 'api.apify.com' not in p['url'] and origin in p['url']
        if node['name']=='Wait 10 seconds': p['amount']=.05
    path=ROOT/(case+'.json');path.write_text(json.dumps(w))
    try:
        imp=subprocess.run(['node',str(BIN),'import:workflow','--input='+str(path)],env=env,capture_output=True,text=True,timeout=120)
        (ROOT/(case+'-import.log')).write_text(imp.stdout+imp.stderr)
        if imp.returncode: raise RuntimeError('Import failed; '+str(ROOT/(case+'-import.log')))
        proc=subprocess.run(['node',str(BIN),'execute','--id='+w['id'],'--rawOutput'],env=env,capture_output=True,text=True,timeout=150)
        (ROOT/(case+'-execution.log')).write_text(proc.stdout+proc.stderr)
        result=None
        for match in re.finditer(r'(?m)^\{',proc.stdout):
            try:
                candidate=json.JSONDecoder().raw_decode(proc.stdout[match.start():])[0]
                runs=candidate.get('data',{}).get('resultData',{}).get('runData',{})
                if 'Final report' in runs: result=runs['Final report'][-1]['data']['main'][0][0]['json']
            except (ValueError,KeyError,TypeError,IndexError): pass
        if not result: raise RuntimeError('No final report; '+str(ROOT/(case+'-execution.log')))
        assert proc.returncode==0
        assert result['inputRecords']==41 and len(result['results'])==41
        assert [r['id'] for r in result['results']]==[r['id'] for r in config['records']]
        assert result['actualChargeUsd'] is None and result['semanticAccuracy'] is None
        if case=='complete':
            assert len(state['posts'])==3 and result['structureValidated']==41 and result['notSubmitted']==0
        else:
            assert len(state['posts'])==2 and result['structureValidated']==21 and result['missing']==19 and result['notSubmitted']==1
        evidence.append({'case':case,'passed':True,'submittedMockRuns':len(state['posts']),
            'inputRecords':41,'outputRecords':41,'missing':result['missing'],'notSubmitted':result['notSubmitted'],
            'mockHttpRequests':state['requests'],'productionRequests':0,'modelCalls':0})
        print(json.dumps(evidence[-1]),flush=True)
    finally: server.shutdown();server.server_close()

version=subprocess.check_output(['node',str(BIN),'--version'],text=True).strip()
report={'n8nVersion':version,'scope':'CLI import and full workflow execution against localhost mock API only',
    'liveApifyEndToEndVerified':False,'cases':evidence}
(HERE/'runtime-evidence.json').write_text(json.dumps(report,indent=2)+'\n')
print('Runtime checks passed. Logs: '+str(ROOT),flush=True)
