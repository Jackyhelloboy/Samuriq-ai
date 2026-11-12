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
sql+="\nUPDATE projects SET uploads_required=0,active=1,onboarding_required=0,evidence_required=0 WHERE id='speech-pair';"
sql+="\nUPDATE projects SET enrollment_only=0 WHERE id='speech-pair';"

# Pre-consented synthetic legacy fixtures only; never an application migration.
sql+="""
INSERT OR IGNORE INTO policy_acceptances(user_id,version_id,role,accepted_name,accepted_at,content_hash) SELECT p.id,c.version_id,r.role,p.name,'2026-11-12T00:00:00Z','fixture' FROM participants p CROSS JOIN current_policy c CROSS JOIN (SELECT 'contributor' role UNION ALL SELECT 'tl' UNION ALL SELECT 'helper' UNION ALL SELECT 'manager' UNION ALL SELECT 'owner') r;
INSERT OR IGNORE INTO policy_acceptances(user_id,version_id,role,accepted_name,accepted_at,content_hash) SELECT 'test-owner',version_id,r.role,'Synthetic owner','2026-11-12T00:00:00Z','fixture' FROM current_policy CROSS JOIN (SELECT 'contributor' role UNION ALL SELECT 'tl' UNION ALL SELECT 'helper' UNION ALL SELECT 'manager' UNION ALL SELECT 'owner') r;
CREATE TRIGGER synthetic_policy_profile AFTER INSERT ON participants BEGIN INSERT OR IGNORE INTO policy_acceptances(user_id,version_id,role,accepted_name,accepted_at,content_hash) SELECT NEW.id,c.version_id,r.role,NEW.name,'2026-11-12T00:00:00Z','fixture' FROM current_policy c CROSS JOIN (SELECT 'contributor' role UNION ALL SELECT 'tl' UNION ALL SELECT 'helper' UNION ALL SELECT 'manager' UNION ALL SELECT 'owner') r; END;
CREATE TRIGGER synthetic_policy_account AFTER INSERT ON accounts BEGIN INSERT OR IGNORE INTO policy_acceptances(user_id,version_id,role,accepted_name,accepted_at,content_hash) SELECT NEW.id,c.version_id,r.role,NEW.name,'2026-11-12T00:00:00Z','fixture' FROM current_policy c CROSS JOIN (SELECT 'contributor' role UNION ALL SELECT 'tl' UNION ALL SELECT 'helper' UNION ALL SELECT 'manager' UNION ALL SELECT 'owner') r; END;
CREATE TRIGGER synthetic_legacy_invite AFTER INSERT ON project_teams BEGIN INSERT INTO team_invites(id,team_id,code,expires_at,max_uses,created_by,created) VALUES ('fixture-'||NEW.id,NEW.id,NEW.code,4070908800000,1000,'fixture','2026-11-12T00:00:00Z'); END;
"""

path=pathlib.Path(state)/'seed.sql' ;path.write_text(sql)
r=subprocess.run(cli+['d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to',state,'--file',str(path)],env=env,capture_output=True,text=True)
assert r.returncode==0,r.stderr
log=open('/tmp/samuriq-test-server.log','w'); server=subprocess.Popen(cli+['dev','--config','dist/server/wrangler.json','--local','--persist-to',state,'--ip','127.0.0.1','--port','8788','--inspector-port','0','--var','HINDI_JOIN_URL:https://t.me/+SyntheticPortalOnly','--var','ADMIN_EMAIL:owner@example.test','--var','PASSWORD_LOGIN_ONLY:1','--var','BOT_USERNAME:SamuriqRegressionBot','--var','TELEGRAM_WEBHOOK_SECRET:local-webhook-secret','--var','BANK_ENCRYPTION_KEY:'+('01'*32)],env=env,stdout=log,stderr=log)
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
 body_request=body
 try:r=opener.open(U.Request(base+path,data=body,headers=headers),timeout=30)
 except urllib.error.HTTPError as e:r=e
 body=r.read().decode();
 if r.status==503 and 'worker restarted mid-request' in body:
  time.sleep(.2)
  try:r=opener.open(U.Request(base+path,data=body_request,headers=headers),timeout=30)
  except urllib.error.HTTPError as e:r=e
  body=r.read().decode()
 return r.status,body,r.headers

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
   if req('/',None)[0]==200:break
  except Exception:pass
  time.sleep(.5)
 else:raise Exception('Server did not start')
 import hashlib
 local_pw='IsolatedAuthRegression-2026!'
 local_hash=hashlib.pbkdf2_hmac('sha256',local_pw.encode(),b'local-only',100000).hex()
 run("UPDATE accounts SET salt='local-only',hash='"+local_hash+"' WHERE id LIKE 'access-review-%'")
 # Host identities are not an alternate public login in password-only mode.
 assert 'Good to see you' not in req('/workspace','worker')[1]
 assert 'Continue with ChatGPT' not in req('/login',None)[1]
 # Review each role through the real password form, with a conflicting owner identity.
 for role,target in [('contributor','/workspace'),('tl','/teams'),('helper','/helper'),('manager','/manager')]:
  f=form('/login','Sign in','owner')
  f.update(email='review.'+role+'@samuriq.example',password=local_pw,return_to='')
  st,b,h=req('/login','owner',f,cookie='sq_workspace=owner')
  assert st in (303,307),(role,st,b[:200])
  assert h.get('Location') in (target,base+target),(role,h.get('Location'))
  cookies=h.get_all('Set-Cookie') or []
  token=next(v.split(';')[0] for v in cookies if v.startswith('sq_session='))
  st,b,h=req('/workspace','owner',cookie=token)
  assert st==200 and 'Owner console' not in b
  if role=='contributor':
   assert 'Staff access review' not in req('/projects',None)[1]
   assert 'Project unavailable' in req('/projects/detail?id=access-review',None)[1]
   st,b,h=req('/workspace/telegram',None,cookie=token)
   fhtml=next(f for f in re.findall(r'<form\b.*?</form>',b,re.S) if 'Create my connection code' in f)
   f={htmlmod.unescape(re.search(r'name="([^"]+)"',i)[1]):htmlmod.unescape((re.search(r'value="([^"]*)"',i)[1] if re.search(r'value="([^"]*)"',i) else "")) for i in re.findall(r'<input[^>]*>',fhtml) if re.search(r'name="([^"]+)"',i)}
   st,b,h=req('/workspace/telegram',None,f,cookie=token)
   codeCookie=next(v.split(';')[0] for v in h.get_all('Set-Cookie') if v.startswith('sq_telegram_code='))
   st,b,h=req('/workspace/telegram',None,cookie=token+'; '+codeCookie)
   code=re.search(r'[?]start=([a-f0-9]{48})',b)[1]
   def webhook(text,chat=1234,secret='local-webhook-secret'):
    payload=json.dumps({'message':{'chat':{'id':chat,'type':'private'},'from':{'username':'copied-name'},'text':text}}).encode()
    try:r=opener.open(U.Request(base+'/api/telegram',data=payload,headers={'Content-Type':'application/json','x-telegram-bot-api-secret-token':secret}),timeout=30)
    except urllib.error.HTTPError as e:r=e
    r.read();return r.status
   assert webhook('/start '+code,secret='wrong')==403
   assert webhook('copied-name')==200 and scalar("select count(*) from telegram_links where user_id='access-review-contributor'")==0
   assert webhook('/start '+code)==200
   assert scalar("select chat_id from telegram_links where user_id='access-review-contributor'")=='1234'
   assert webhook('/start '+code,chat=9999)==200
   assert scalar("select chat_id from telegram_links where user_id='access-review-contributor'")=='1234'

   st,b,h=req('/admin/security','owner',cookie=token)
   assert 'Save my password' not in b and st!=200
   st,b,h=req('/workspace/client','owner',cookie=token)
   assert st==200 and 'No project selected yet' in b
  run("UPDATE review_account_expiry SET expires=1 WHERE user_id='access-review-"+role+"'")
  st,b,h=req('/workspace','owner',cookie=token)
  assert 'Owner console' not in b and 'Good to see you' not in b
 # A malformed session must not fall back to the browser owner identity.
 assert 'Owner console' not in req('/workspace','owner',cookie='sq_session=invalid')[1]
 print('PASS AUTH: normal password login for contributor, TL, helper and manager; session priority over host owner; stale workspace cleared; contributor denied owner settings; expired and malformed sessions cannot become owner; password-only public auth; client access page; archive isolation; one-time Telegram binding and replay/secret denial.')
finally:
 server.terminate();server.wait(timeout=10)
