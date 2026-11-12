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
sql+="\nUPDATE projects SET enrollment_only=0 WHERE id='speech-pair';"
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
 # PAN collection removed. Bank storage is independent and family sharing still needs owner consent.
 assert 'name="pan"' not in req('/workspace/payments')[1]
 assert 'type="file"' not in req('/workspace/payments')[1]
 assert req('/admin/identity','worker')[0]!=200
 def bank(user,account='12345678901'):
  f=form('/workspace/payments','Save bank details',user);f.update(holder='Synthetic Test User',account=account,confirm=account,ifsc='TEST0123456',consent='yes');return f
 workerbank=bank('worker');assert req('/workspace/payments','worker',workerbank)[0]==303
 assert scalar('select count(*) from identity_records')==0
 leadbank=bank('lead');assert req('/workspace/payments','lead',leadbank)[2]['Location'].endswith('issue=shared-bank')
 assert scalar('select count(*) from bank_details')==1
 family=form('/workspace/payments','Send request for owner review','lead');family.update(holder='Synthetic Test User',account='12345678901',confirm='12345678901',ifsc='TEST0123456',consent='yes',reason='Synthetic family relationship review request for local test');assert req('/workspace/payments','lead',family)[0]==303
 review=form('/admin/identity','Record owner decision','owner');review.update(decision='approve',note='Synthetic reviewed family request',holderConsent='yes')
 assert req('/admin/identity','worker',review)[0]>=400
 without={k:v for k,v in review.items() if k!='holderConsent'};assert req('/admin/identity','owner',without)[0]>=400
 assert req('/admin/identity','owner',review)[0]==303
 assert scalar('select count(*) from bank_details')==2 and scalar('select count(*) from family_grants')==1
 assert req('/admin/identity','owner',review)[0]>=400
 assert req('/workspace/payments','lead',leadbank)[0]==303
 # Manager visibility does not expose private identity operations.
 grant=form('/admin/people','Appoint manager','owner');grant.update(userId='test-worker',grant='yes');assert req('/admin/people','owner',grant)[0]==303
 assert req('/admin/projects','worker')[0]==200 and req('/admin/identity','worker')[0]!=200
 # Closing is enforced at the server, including captured older application forms.
 fresh=form('/projects/detail?id=speech-pair','Submit application','partner');fresh.update(projectId='speech-pair',partner='Synthetic',partnerEmail='other@example.test',communityHandle='@synthetic',experience='Synthetic',consent='yes')
 toggle=form('/admin/projects','Close project','worker');toggle.update(id='speech-pair',active='0');assert req('/admin/projects','worker',toggle)[0]==303
 assert 'Project closed' in req('/')[1]
 assert 'Submit application' not in req('/projects/detail?id=speech-pair','partner')[1]
 assert 'Onboarding is closed' in req('/projects/onboarding?id=speech-pair','partner')[1]
 assert req('/projects/detail','partner',fresh)[0]>=400
 assert req('/projects/launch','worker',{'projectId':'speech-pair'})[0]==403
 run("update projects set community_url='https://t.me/synthetic_test' where id='speech-pair'")
 toggle['active']='1';assert req('/admin/projects','worker',toggle)[0]==303
 assert 'Submit application' in req('/projects/detail?id=speech-pair','partner')[1]
 # Detected full duration raises the gate above an owner's minimum.
 run("update projects set onboarding_required=1,tutorial_seconds=10,tutorial_url='https://cdn.example.test/tutorial.mp4',terms='Synthetic terms' where id='speech-pair'")
 def action(name,args):
  src=''.join(p.read_text() for p in pathlib.Path('dist/client').rglob('tutorial-player-*.js'))
  m=re.search(r'[`\"\']([^`\"\']+#'+name+r')[`\"\']',src);assert m,name
  headers={'oai-authenticated-user-id':'test-partner','oai-authenticated-user-email':'partner@example.test','Content-Type':'application/json','Origin':base,'Next-Action':m[1]}
  try:r=opener.open(U.Request(base+'/projects/onboarding?id=speech-pair',data=json.dumps(args).encode(),headers=headers),timeout=20)
  except urllib.error.HTTPError as e:r=e
  result=r.read().decode();val=None
  for line in result.splitlines():
   if line.startswith('1:') or line.startswith('0:'):
    try:
     val=json.loads(line[2:]);val=val.get('returnValue',{}).get('data',val) if isinstance(val,dict) else val
    except Exception:pass
  return r.status,val
 st,val=action('startTutorial',['speech-pair']);assert st==200 and val;nonce=val['nonce']
 assert action('setVideoDuration',['speech-pair',nonce,20])[0]==200
 run("update onboarding set watched=10 where user_id='test-partner'")
 accept=form('/projects/onboarding?id=speech-pair','Accept and continue','partner');accept.update(projectId='speech-pair',clientEmail='partner@example.test',clientUsername='synthetic-client',terms='yes',inviteCode='IMCIAD')
 assert req('/projects/onboarding','partner',accept)[0]>=400
 run("update onboarding set position=10,last_tick=%d where user_id='test-partner'"%(int(time.time()*1000)-11000))
 assert action('recordPlayback',['speech-pair',nonce,20])[0]==200
 assert scalar("select watched from onboarding where user_id='test-partner'")==20
 assert req('/projects/onboarding','partner',accept)[0]==303
 print('PASS payment policy: PAN collection absent; encrypted bank onboarding without identity documents; owner-only family consent review; manager isolation; closed project server guards; actual-duration tutorial gate.')
finally:
 server.terminate();server.wait(timeout=10)
