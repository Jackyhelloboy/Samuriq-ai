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
 run("update projects set target_start='%s',deadline='%s' where id='speech-pair'"%(ymd(0),ymd(7)))
 run("update applications set created='%sT00:00:00Z'"%ymd(0))
 # Owner-reserved email, password hashing and normal account session
 f=form('/login','Create account',None);f.update(name='New User',email='pw@example.test',password='longpassword1')
 st,b,h=req('/login',None,f);assert st==303,(st,b[:200]);cookie=h['Set-Cookie'].split(';')[0]
 assert req('/workspace',None,cookie=cookie)[0]==200
 assert scalar("select hash from accounts where email='pw@example.test'")!='longpassword1'
 f.update(email='owner@example.test');assert 'error=admin' in req('/login',None,f)[2]['Location']
 # Grant manager by an authenticated owner; no admin assignment capability
 grant=form('/admin/people','Appoint manager','owner');grant.update(userId='test-worker',grant='yes');assert req('/admin/people','owner',grant)[0]==303
 assert req('/admin','worker')[0]==200 and req('/admin/onboarding','worker')[0]==200
 for path in ['/admin/people','/admin/payments','/admin/settings','/admin/security','/admin/content','/admin/registrations']:
  assert req(path,'worker')[0]!=200,path
 assert req('/admin/payments/reveal','worker',{'userId':'test-worker'})[0]==403
 # Current tutorial cannot be bypassed by posting a captured application form
 run("insert into participants(id,name,email,telegram,language,project,created) values('test-fresh','Fresh User','fresh@example.test','','Hindi','general','2026-01-01')")
 fresh=form('/projects/detail?id=speech-pair','Submit application','fresh');fresh.update(projectId='speech-pair',partner='Permanent Partner',partnerEmail='partner@example.test',communityHandle='@leaduser',experience='Ready',consent='yes')
 run("update projects set onboarding_required=1,tutorial_seconds=10,tutorial_url='https://cdn.example.test/tutorial.mp4',terms='Project terms for local tests' where id='speech-pair'")
 assert req('/projects/detail?id=speech-pair','fresh',fresh)[0]>=400
 def action(name,args,user='worker'):
  src=''.join(p.read_text() for p in pathlib.Path('dist/client').rglob('tutorial-player-*.js'))
  m=re.search(r'[`\"\']([^`\"\']+#'+name+r')[`\"\']',src);assert m,name
  headers={'oai-authenticated-user-id':'test-'+user,'oai-authenticated-user-email':user+'@example.test','Content-Type':'application/json','Origin':base,'Next-Action':m[1]}
  try:r=opener.open(U.Request(base+'/projects/onboarding?id=speech-pair',data=json.dumps(args).encode(),headers=headers),timeout=20)
  except urllib.error.HTTPError as e:r=e
  text=r.read().decode()
  val=None
  for line in text.splitlines():
   if line.startswith('1:') or line.startswith('0:'):
    try:
     val=json.loads(line[2:]);val=val.get('returnValue',{}).get('data',val) if isinstance(val,dict) else val
    except Exception:pass
  return r.status,val,text
 st,val,text=action('startTutorial',['speech-pair']);assert st==200 and val and 'nonce' in val,(st,text[:300]);nonce=val['nonce']
 accept=form('/projects/onboarding?id=speech-pair','Accept and continue');accept.update(projectId='speech-pair',clientEmail='worker@example.test',clientUsername='test-client',terms='yes')
 assert req('/projects/onboarding',data=accept)[0]>=400
 # A playback jump receives no credit, a replayed heartbeat cannot add duplicate time
 run("update onboarding set last_tick=%d where user_id='test-worker'"%(int(time.time()*1000)-6000))
 action('recordPlayback',['speech-pair',nonce,1000]);assert scalar("select watched from onboarding where user_id='test-worker'")==0
 run("update onboarding set last_tick=%d where user_id='test-worker'"%(int(time.time()*1000)-6000))
 action('recordPlayback',['speech-pair',nonce,5]);assert scalar("select watched from onboarding where user_id='test-worker'")==5
 action('recordPlayback',['speech-pair',nonce,5]);assert scalar("select watched from onboarding where user_id='test-worker'")==5
 run("update onboarding set last_tick=%d where user_id='test-worker'"%(int(time.time()*1000)-6000))
 action('recordPlayback',['speech-pair',nonce,10]);assert scalar("select watched from onboarding where user_id='test-worker'")==10
 accept['clientEmail']='different@example.test';assert req('/projects/onboarding',data=accept)[0]>=400
 accept['clientEmail']='worker@example.test';assert req('/projects/onboarding',data=accept)[0]==303
 assert scalar("select client_email from onboarding where user_id='test-worker'")=='worker@example.test'
 assert req('/projects/launch','worker',{'projectId':'speech-pair'})[0]==303
 assert req('/projects/launch','worker',{'projectId':'speech-pair'},origin='https://evil.example')[0]==403
 assert req('/projects/launch','other',{'projectId':'speech-pair'})[0]==403
 # Material changes invalidate previous acceptance
 run("update projects set terms='Updated local test terms' where id='speech-pair'")
 assert req('/projects/launch','worker',{'projectId':'speech-pair'})[0]==403
 run("update projects set terms='Project terms for local tests' where id='speech-pair'")
 # Manager may review evidence, but cannot set client-QC approved minutes
 day=ymd(0)
 run("insert into project_progress(user_id,project_id,day,status,minutes,units,notes,updated) values('test-worker','speech-pair','%s','started',30,2,'fixture','version1')"%day)
 review=form('/admin/reports','Save review','worker');review.update(userId='test-worker',projectId='speech-pair',day=day,version='version1',review='client-approved',reviewNote='Test QC',approvedMinutes='30')
 assert req('/admin/reports','worker',review)[0]>=400
 review['review']='proof-reviewed';assert req('/admin/reports','worker',review)[0]==303
 review['review']='client-approved';assert req('/admin/reports','owner',review)[0]==303
 review['review']='pending';assert req('/admin/reports','worker',review)[0]>=400
 assert req('/admin/registrations','owner')[0]==200
 # Verify key owner and manager screens render with fixture data
 for path in ['/admin','/admin/projects','/admin/projects/edit?id=speech-pair','/admin/team','/admin/roster','/admin/reports','/admin/onboarding','/admin/content','/admin/security','/admin/people','/admin/settings','/admin/payments','/admin/integrations']:
  assert req(path,'owner')[0]==200,path
 grant['grant']='no';assert req('/admin/people','owner',grant)[0]==303
 assert req('/admin','worker')[0]!=200
 assert 'opportunity-card' in req('/')[1]
 print('PASS: password accounts; owner reservation; role grant/revoke; manager isolation; tutorial gate, replay/skip rejection and terms versioning; matching client email; same-origin approved client launch; owner-only QC; all owner screens render.')
finally:
 server.terminate();server.wait(timeout=10)
