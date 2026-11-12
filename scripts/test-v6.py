import html as htmlmod
import urllib.request as U, urllib.error, re, json, time, subprocess, pathlib, tempfile, sqlite3, os
root=pathlib.Path.cwd(); state=tempfile.mkdtemp(prefix='samuriq-test-'); env={**os.environ,'WRANGLER_SEND_METRICS':'false'}
cli=['node','--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js']
sql='\n'.join(p.read_text().replace('--> statement-breakpoint','') for p in sorted(pathlib.Path('drizzle').glob('*.sql')))
sql+='''\nINSERT INTO participants(id,name,email,telegram,language,project,created) VALUES ('test-worker','Test Worker','worker@example.test','','Hindi','general','2026-01-01'),('test-missing','Missing Worker','missing@example.test','','Hindi','general','2026-01-01');
INSERT INTO applications(user_id,project_id,partner,experience,status,created) VALUES ('test-worker','speech-pair','Partner','Test','approved','2026-01-01'),('test-missing','speech-pair','Partner','Test','approved','2026-01-01');'''
sql+="""
UPDATE applications SET community_verified=1,partner_confirmed=1;
INSERT INTO participants(id,name,email,telegram,language,project,created) VALUES ('test-lead','New Lead','lead@example.test','','Hindi','general','2026-01-01'),('test-partner','Permanent Partner','partner@example.test','','Hindi','general','2026-01-01'),('test-other','Other Lead','other@example.test','','Hindi','general','2026-01-01');
INSERT INTO applications(user_id,project_id,partner,partner_email,experience,status,created) VALUES ('test-lead','speech-pair','Permanent Partner','partner@example.test','Test','pending','2026-01-01'),('test-other','speech-pair','Permanent Partner','partner@example.test','Test','pending','2026-01-01');
"""
sql+="\nUPDATE projects SET active=1,onboarding_required=0,evidence_required=0 WHERE id='speech-pair';"
path=pathlib.Path(state)/'seed.sql' ;path.write_text(sql)
r=subprocess.run(cli+['d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to',state,'--file',str(path)],env=env,capture_output=True,text=True)
assert r.returncode==0,r.stderr
log=open('/tmp/samuriq-test-server.log','w'); server=subprocess.Popen(cli+['dev','--config','dist/server/wrangler.json','--local','--persist-to',state,'--ip','127.0.0.1','--port','8788','--inspector-port','0','--var','ADMIN_EMAIL:owner@example.test','--var','BANK_ENCRYPTION_KEY:'+('01'*32)],env=env,stdout=log,stderr=log)
base='http://127.0.0.1:8788'
class NoRedirect(U.HTTPRedirectHandler):
 def redirect_request(self,*args,**kw):return None
opener=U.build_opener(NoRedirect)
def req(path,user='worker',data=None,origin=base,cookie=None):
 headers={'oai-authenticated-user-id':'test-'+user,'oai-authenticated-user-email':user+'@example.test'} if user else {}
 if cookie: headers['Cookie']=cookie
 if data is not None:
  boundary='SAMURIQ_TEST';body=''.join('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"'+('; filename="'+v[0]+'"' if isinstance(v,tuple) else '')+'\r\n\r\n'+(v[1] if isinstance(v,tuple) else str(v))+'\r\n' for k,v in data.items())+'--'+boundary+'--\r\n';body=body.encode();headers.update({'Content-Type':'multipart/form-data; boundary='+boundary,'Origin':origin})
 else: body=None
 try:r=opener.open(U.Request(base+path,data=body,headers=headers),timeout=20)
 except urllib.error.HTTPError as e:r=e
 return r.status,r.read().decode(),r.headers

def form(path,contains,user='worker'):
 status,body,_=req(path,user);assert status==200,(path,status,body[:100]);forms=re.findall(r'<form\b.*?</form>',body,re.S);f=next((f for f in forms if contains in f),None);assert f,(contains,body[:100]);return {htmlmod.unescape(re.search(r'name="([^"]+)"',i)[1]):htmlmod.unescape((re.search(r'value="([^"]*)"',i)[1] if re.search(r'value="([^"]*)"',i) else "")) for i in re.findall(r'<input[^>]*>',f) if re.search(r'name="([^"]+)"',i)}
def db():
 for file in pathlib.Path(state).rglob('*.sqlite'):
  c=sqlite3.connect(file)
  if c.execute("select count(*) from sqlite_master where name='bank_details'").fetchone()[0]:return c
  c.close()
 raise Exception('Test DB missing')
def scalar(sql):
 c=db();v=c.execute(sql).fetchone()[0];c.close();return v
def run(sql):
 c=db();c.execute(sql);c.commit();c.close()
def ymd(d):
 import datetime;return (datetime.datetime.utcnow()+datetime.timedelta(hours=5,minutes=30,days=d)).strftime('%Y-%m-%d')

try:
 for i in range(60):
  try:
   if req('/')[0]==200:break
  except Exception:pass
  time.sleep(.5)
 else:raise Exception('Server did not start')
 initial=scalar('select count(*) from participants')
 for role in ['owner','manager','tl','contributor']:
  st,b,h=req('/demo?role='+role,None);assert st==200 and 'Interactive demo.' in b and 'SAMPLE DATA' in b
 assert scalar('select count(*) from participants')==initial
 assert scalar('select count(*) from project_teams')==0
 assert scalar('select count(*) from payout_orders')==0
 assert 'Owner console' not in req('/projects',None)[1]
 assert req('/admin/dashboard','worker')[0]!=200 and req('/manager','worker')[0]!=200
 assert req('/admin/expenses','worker')[0]!=200
 grant=form('/admin/people','Appoint manager','owner');grant.update(userId='test-worker',grant='yes');assert req('/admin/people','owner',grant)[0]==303
 assert req('/manager','worker')[0]==200 and req('/admin/dashboard','owner')[0]==200
 assert 'Owner console' not in req('/manager','worker')[1]
 assert '/admin/identity' not in req('/manager','worker')[1]
 assert req('/admin/dashboard','worker')[0]!=200
 assert req('/manager?project=missing-project','worker')[0]==200
 # Actual workspace choices are derived from authenticated roles, never a query parameter.
 assert req('/manager?role=owner','worker')[0]==200 and '/admin/payouts' not in req('/manager?role=owner','worker')[1]
 assert '/manager' in req('/projects','worker')[1]
 assert '/admin/dashboard' in req('/projects','owner')[1]
 assert req('/login','owner')[2].get('Location')=='/admin/dashboard'
 assert req('/login','worker')[2].get('Location')=='/manager'
 expense=form('/admin/expenses','Record expense','owner');expense.update(projectId='speech-pair',title='Synthetic recruitment cost',category='Recruitment',amount='12.34',day=ymd(0),reference='SYNTHETIC-INVOICE')
 assert req('/admin/expenses','worker',expense)[0]>=400
 assert req('/admin/expenses','owner',expense,origin='https://evil.example')[0]>=400
 assert req('/admin/expenses','owner',expense)[0]==303
 assert scalar('select amount_paise from project_expenses')==1234
 invalid={**expense,'amount':'-1'};assert req('/admin/expenses','owner',invalid)[0]>=400
 reverse=form('/admin/expenses','Record reversal','owner');reverse.update(reason='Synthetic correction for automated test');assert req('/admin/expenses','worker',reverse)[0]>=400;assert req('/admin/expenses','owner',reverse)[0]==303
 assert scalar('select status from project_expenses')=='reversed'
 assert scalar('select count(*) from earnings')==0 and scalar('select count(*) from payout_orders')==0
 # Private escalations are never placed in the TL action queue.
 run("insert into project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created) values('test-team','speech-pair','test-lead','Synthetic TL','test-code',25000,25000,'test-owner','2026-01-01')")
 run("insert into support_tickets(id,project_id,team_id,requester_id,subject,body,private_escalation,created,updated) values('private-id','speech-pair','test-team','test-other','Private concern secret','Synthetic private concern body',1,'2026-01-01','2026-01-01')")
 run("insert into support_tickets(id,project_id,team_id,requester_id,subject,body,private_escalation,created,updated) values('public-id','speech-pair','test-team','test-other','Assigned normal ticket','Synthetic normal query body',0,'2026-01-01','2026-01-01')")
 b=req('/notifications','lead')[1];assert 'Assigned normal ticket' in b and 'Private concern secret' not in b
 assert 'Private concern secret' in req('/notifications','worker')[1]
 assert req('/login','lead')[2].get('Location')=='/teams'
 assert 'Team leader workspace' in req('/projects','lead')[1]
 for path in ['/','/projects','/workspace','/workspace/payments','/support','/notifications','/manager','/admin/dashboard','/admin','/admin/projects','/admin/expenses','/admin/leaders','/admin/payouts','/admin/identity','/admin/security','/admin/settings']:
  assert req(path,'owner')[0]==200,path
 assert 'Share Healthcare conversation recording' in req('/')[1]
 run("update projects set active=0,visibility='listed' where id='speech-pair'")
 assert 'Share Healthcare conversation recording' in req('/')[1]
 assert req('/projects/detail?id=speech-pair','other')[0]==200 and 'currently closed' in req('/projects/detail?id=speech-pair','other')[1]
 print('PASS V6: isolated demos; role-specific dashboards and switcher choices; no query-based elevation; owner-only expense ledger and reversals; CSRF; private notification scoping; public project sharing with closed-work access blocked; key pages render with the shared shell.')
finally:
 server.terminate();server.wait(timeout=10)
