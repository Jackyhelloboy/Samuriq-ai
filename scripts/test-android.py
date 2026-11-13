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

# Legacy fixtures isolate their existing workflows; Telegram gates are tested separately.
sql+="\nUPDATE projects SET telegram_required=0;"
path=pathlib.Path(state)/'seed.sql' ;path.write_text(sql)
r=subprocess.run(cli+['d1','execute','DB','--config','dist/server/wrangler.json','--local','--persist-to',state,'--file',str(path)],env=env,capture_output=True,text=True)
assert r.returncode==0,r.stderr
log=open('/tmp/samuriq-test-server.log','w'); server=subprocess.Popen(cli+['dev','--config','dist/server/wrangler.json','--local','--persist-to',state,'--ip','127.0.0.1','--port','8788','--inspector-port','0','--var','BOT_USERNAME:SamuriqRegressionBot','--var','TELEGRAM_WEBHOOK_SECRET:android-test-secret','--var','ADMIN_EMAIL:owner@example.test','--var','BANK_ENCRYPTION_KEY:'+('01'*32)],env=env,stdout=log,stderr=log)
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
 run("UPDATE projects SET active=1,target_start='',deadline='',telegram_required=1 WHERE id='speech-pair'")
 assert scalar("SELECT count(*) FROM projects WHERE sample=1 AND active=0")==3
 st,body,_=req('/projects',None);assert st==200 and body.count('SAMPLE · CLOSED')>=3
 assert 'href="/projects/detail?id=sample-' not in body
 for id in ['sample-3d-hands','sample-pov','sample-video']:
  st,b,_=req('/projects/onboarding?id='+id,'worker');assert st==200 and 'Onboarding is closed' in b and '<iframe' not in b
 st,b,_=req('/workspace?edit=1','worker');s=re.search(r'<select[^>]*name="primaryProject".*?</select>',b,re.S)[0]
 assert 'speech-pair' in s and 'sample-' not in s and 'Explore all AI projects' not in s
 # Telegram gate: an unverified username does not reveal a playable tutorial.
 st,b,_=req('/projects/onboarding?id=speech-pair','worker');assert st==200 and 'Connect Telegram before training' in b and 'drive.google.com/file' not in b
 st,b,_=req('/api/telegram/me',None);assert st==401 and 'chat' not in b
 st,b,_=req('/api/telegram/me','worker');assert st==200 and json.loads(b)['verified']==False
 import hashlib
 def makecode(user,code):run("INSERT INTO telegram_link_codes(code_hash,user_id,expires,used) VALUES ('%s','test-%s',%d,0)"%(hashlib.sha256(code.encode()).hexdigest(),user,int(time.time()*1000)+600000))
 def webhook(code,chat=12345,username='android_member',secret='android-test-secret',fromid=None,text=None):
  payload=json.dumps({'message':{'chat':{'id':chat,'type':'private'},'from':{'id':chat if fromid is None else fromid,'username':username},'text':text or '/start '+code}}).encode()
  try:r=opener.open(U.Request(base+'/api/telegram',data=payload,headers={'Content-Type':'application/json','x-telegram-bot-api-secret-token':secret}),timeout=30)
  except urllib.error.HTTPError as e:r=e
  response=r.read().decode()
  if r.status==503 and 'worker restarted mid-request' in response:
   time.sleep(.2)
   try:r=opener.open(U.Request(base+'/api/telegram',data=payload,headers={'Content-Type':'application/json','x-telegram-bot-api-secret-token':secret}),timeout=30)
   except urllib.error.HTTPError as e:r=e
   response=r.read().decode()
  return r.status,response
 code='a'*48;makecode('worker',code)
 assert webhook(code,secret='wrong')[0]==403
 assert webhook(code,fromid=999)[0]==200 and scalar("SELECT used FROM telegram_link_codes WHERE user_id='test-worker'")==0
 assert webhook(code)[0]==200
 assert scalar("SELECT username FROM telegram_links WHERE user_id='test-worker'")=='android_member'
 assert scalar("SELECT telegram FROM participants WHERE id='test-worker'")=='@android_member'
 st,b,_=req('/api/telegram/me','worker');assert json.loads(b)['verified'] and json.loads(b)['username']=='@android_member' and '12345' not in b
 assert 'android_member' not in req('/api/telegram/me','other')[1]
 st,b,_=req('/projects/onboarding?id=speech-pair','worker');assert st==200 and 'Reference video' in b and 'Playback is recorded in this player' in b
 # Replays cannot bind another chat; the same Telegram identity cannot register a second site account.
 assert webhook(code,chat=99999)[0]==200 and scalar("SELECT chat_id FROM telegram_links WHERE user_id='test-worker'")=='12345'
 another='b'*48;makecode('other',another);assert webhook(another)[0]==200
 assert scalar("SELECT count(*) FROM telegram_links WHERE user_id='test-other'")==0
 # No username: connected identity is not yet verified for this project's required username gate.
 missing='c'*48;makecode('missing',missing);assert webhook(missing,chat=33333,username='')[0]==200
 assert not json.loads(req('/api/telegram/me','missing')[1])['verified']
 assert webhook('',chat=33333,username='now_has_username',text='/status')[0]==200
 assert json.loads(req('/api/telegram/me','missing')[1])['verified']
 # Additional project requires the original TL grant; forging a posted preference is rejected.
 run("INSERT INTO participants(id,name,email,telegram,language,project,phone,phone_consent,created) VALUES ('test-tl','Lead','tl@example.test','','Hindi','general','910000000001',1,'2026-01-01')")
 run("INSERT INTO project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created) VALUES ('android-team','speech-pair','test-tl','Android team','android-team-code',20000,20000,'test-owner','2026-01-01')")
 run("INSERT INTO team_members(project_id,user_id,team_id,rate_paise,base_rate_paise,joined) VALUES ('speech-pair','test-worker','android-team',20000,25000,'2026-01-01')")
 run("INSERT INTO projects(id,title,category,description,requirements,client_url,invite_code,created,active) VALUES ('second-live','Second active','AI training','Test only','Test only','','','2026-01-01',1)")
 f=form('/workspace?edit=1','Save my profile','worker');f.update(name='Test Worker',username='android_worker',language='Hindi',project='general',primaryProject='second-live',telegram='@imposter_name',consent='yes',platformPolicyConsent='yes')
 f['primaryProject']='sample-pov'
 st,b,h=req('/workspace','worker',f);assert st in (303,307) and 'project-closed' in h.get('Location','')
 f['primaryProject']='second-live'
 st,b,h=req('/workspace','worker',f);assert st in (303,307) and 'project-permission' in h.get('Location',''),(st,h.get('Location'),b[:200])
 assert scalar("SELECT primary_project_id FROM participants WHERE id='test-worker'")!='second-live'
 run("INSERT INTO project_permissions(team_id,user_id,project_id,status,reason,updated) VALUES ('android-team','test-worker','second-live','approved','Fixture approval','2026-01-01')")
 f=form('/workspace?edit=1','Save my profile','worker');f.update(name='Test Worker',username='android_worker',language='Hindi',project='general',primaryProject='second-live',telegram='@imposter_name',consent='yes',platformPolicyConsent='yes')
 assert req('/workspace','worker',f)[0] in (303,307)
 assert scalar("SELECT primary_project_id FROM participants WHERE id='test-worker'")=='second-live'
 assert scalar("SELECT telegram FROM participants WHERE id='test-worker'")=='@android_member'
 print('PASS ANDROID: three closed labeled samples; one active default; active-only primary interest; server-enforced TL switch permission; Telegram identity/username ownership, one-use replay resistance, cross-account chat uniqueness, private self-status, no-username gate; reference tutorial disclosure; closed onboarding blocked. No real Telegram messages or payments.')
finally:
 server.terminate();server.wait(timeout=10)
