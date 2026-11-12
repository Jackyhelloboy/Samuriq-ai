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
def approved_launch(user='worker'):
 f=form('/projects/work?id=speech-pair','Load client workspace',user)
 f.update(mode='embed')
 return req('/projects/launch',user,f)


try:
 for i in range(60):
  try:
   if req('/')[0]==200:break
  except Exception:pass
  time.sleep(.5)
 else:raise Exception('Server did not start')
 run("update projects set active=1,target_start='%s',deadline='%s',external_allowed=0,community_url='https://t.me/synthetic' where id='speech-pair'"%(ymd(0),ymd(7)))
 run("update applications set created='%sT00:00:00Z'"%ymd(0))
 for role in ['owner','manager','tl','contributor']:
  st,b,h=req('/demo?role='+role,None);assert st==200 and 'v7-suite' in b and 'Workspace V7' in b and 'Interactive demo.' in b
 b=req('/workspace','worker')[1];assert 'Before you start' in b and 'Daily work record' in b and 'My evidence folder' in b
 assert 'Your project team' in b and 'Payment overview' in b
 assert 'Bank &amp; PAN' not in req('/workspace/earnings','worker')[1]
 # No unauthorized client URL appears in public/project workspace HTML.
 assert 'webrtcsg.shenfei-rec.com' not in req('/workspace','missing')[1]
 for path in ['/','/projects','/projects/detail?id=speech-pair']:
  assert 'webrtcsg.shenfei-rec.com' not in req(path,None)[1],path
 assert req('/projects/launch','worker',{'projectId':'speech-pair'})[0]==403
 assert req('/projects/launch','worker')[0] in (404,405)
 f=form('/projects/work?id=speech-pair','Load client workspace','worker');assert len(f['session'])==72
 assert 'Open approved external session' not in req('/projects/work?id=speech-pair','worker')[1]
 assert scalar('select count(*) from launches')==0
 assert req('/projects/launch','worker',{**f,'mode':'external'})[0]==403
 assert req('/projects/launch','other',{**f,'mode':'embed'})[0]==403
 result=req('/projects/launch','worker',{**f,'mode':'embed'});assert result[0]==303,(result[0],result[1][:600],f)
 assert req('/projects/launch','worker',{**f,'mode':'embed'})[0]==403
 assert scalar('select count(*) from launches')==1
 assert req('/projects/launch','worker',{**f,'mode':'embed'},origin='https://evil.example')[0]==403
 # Expiry and changed approval are enforced on consumption, not only on page load.
 expired=form('/projects/work?id=speech-pair','Load client workspace','worker')
 run('update launch_tickets set expires=1 where used=0')
 assert req('/projects/launch','worker',{**expired,'mode':'embed'})[0]==403
 fresh=form('/projects/work?id=speech-pair','Load client workspace','worker')
 run("update applications set status='declined' where user_id='test-worker'")
 assert req('/projects/launch','worker',{**fresh,'mode':'embed'})[0]==403
 run("update applications set status='approved' where user_id='test-worker'")
 # Browser navigation outside an iframe is rejected in embed-only mode.
 import urllib.parse as P
 def launch_meta(f,dest):
  headers={'Content-Type':'application/x-www-form-urlencoded','Origin':base,'Sec-Fetch-Dest':dest,'oai-authenticated-user-id':'test-worker','oai-authenticated-user-email':'worker@example.test'}
  try:r=opener.open(U.Request(base+'/projects/launch',data=P.urlencode(f).encode(),headers=headers),timeout=20)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read().decode()
 assert launch_meta({**fresh,'mode':'embed'},'document')[0]==403
 assert launch_meta({**fresh,'mode':'embed'},'iframe')[0]==303
 # Opting in to an external window is owner-configured; the client remains independent.
 run("update projects set external_allowed=1 where id='speech-pair'")
 external=form('/projects/work?id=speech-pair','Load client workspace','worker');assert 'Open approved external session' in req('/projects/work?id=speech-pair','worker')[1]
 assert launch_meta({**external,'mode':'external'},'document')[0]==303
 # Shared tokens are atomically single-use even with simultaneous requests.
 from concurrent.futures import ThreadPoolExecutor
 concurrent=form('/projects/work?id=speech-pair','Load client workspace','worker')
 with ThreadPoolExecutor(max_workers=2) as pool:
  outcomes=list(pool.map(lambda _:launch_meta({**concurrent,'mode':'embed'},'iframe')[0],range(2)))
 assert sorted(outcomes)==[303,403],outcomes
 # The generation limit is server-side and does not create more tickets when reached.
 run("update auth_limits set attempts=20 where key like 'client:%'")
 count_before=scalar('select count(*) from launch_tickets')
 st,b,_=req('/projects/work?id=speech-pair','worker');assert st==200 and 'Too many session requests' in b
 assert scalar('select count(*) from launch_tickets')==count_before
 # Public demo requests are bounded to synthetic client data and do not query or mutate live memberships.
 start=time.monotonic()
 with ThreadPoolExecutor(max_workers=6) as pool:
  status=list(pool.map(lambda role:req('/demo?role='+role,None)[0],['owner','manager','tl','contributor']*3))
 assert all(s==200 for s in status),status
 assert scalar('select count(*) from payout_orders')==0
 print('PASS V7: consistent role demos; task-first contributor workspace; public client URL isolation; one-use hashed sessions; replay/expiry/account binding; approval rechecks; origin and iframe policy; explicit external opt-in; atomic concurrent claims; generation throttling; 12 synthetic demo requests across six local concurrent workers in %.2fs. This is not a production capacity guarantee.'%(time.monotonic()-start))
finally:
 server.terminate();server.wait(timeout=10)
