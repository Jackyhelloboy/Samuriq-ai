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
 run("UPDATE projects SET active=1,target_start='',deadline='',pair=1,onboarding_required=1,enrollment_only=0,evidence_required=0,telegram_required=0,tutorial_seconds=61,tutorial_url='https://samuriq-ai-recording-community.thinladle2.chatgpt.site/media/orientation-reference.mp4',register_url='',intro_url='' WHERE id='speech-pair'")
 st,b,_=req('/projects/detail?id=speech-pair',None);assert st==200 and '<iframe' not in b and 'Open client website' in b and 'Watch tutorial, accept terms' in b
 run("INSERT INTO participants(id,name,email,telegram,language,project,phone,phone_consent,created) VALUES ('test-new','New Applicant','new@example.test','@new_member','Hindi','general','910000000001',1,'2026-01-01')")
 def action(name,args,user='new'):
  src=''.join(p.read_text() for p in pathlib.Path('dist/client').rglob('tutorial-player-*.js'))
  m=re.search(r'[`\"\']([^`\"\']+#'+name+r')[`\"\']',src);assert m,name
  headers={'oai-authenticated-user-id':'test-'+user,'oai-authenticated-user-email':user+'@example.test','Content-Type':'application/json','Origin':base,'Next-Action':m[1]}
  try:r=opener.open(U.Request(base+'/projects/onboarding?id=speech-pair',data=json.dumps(args).encode(),headers=headers),timeout=20)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read().decode()
 st,b,_=req('/projects/onboarding?id=speech-pair','new');assert st==200 and '<video' in b and '/media/orientation-reference.mp4' in b and 'name="partnerEmail"' in b and 'name="experience"' in b
 started=action('startTutorial',['speech-pair']);assert started[0]==200
 nonce=re.search(r'"nonce":"([^"]+)"',started[1])[1]
 f=form('/projects/onboarding?id=speech-pair','Accept and continue','new');f.update(projectId='speech-pair',clientEmail='new@example.test',clientUsername='new-client-id',terms='yes',inviteCode='IMCIAD',submitApplication='yes',consent='yes',partner='Permanent Partner',partnerEmail='partner@example.test',communityHandle='@new_member',experience='Evenings, flexible paired work')
 assert req('/projects/onboarding','new',f)[0]>=400
 assert scalar("SELECT count(*) FROM applications WHERE user_id='test-new'")==0
 # Simulate elapsed time only in the isolated DB. Actual production ticks remain wall-clock gated.
 run("UPDATE onboarding SET last_tick=%d WHERE user_id='test-new'"%(int(time.time()*1000)-4990))
 assert action('recordPlayback',['speech-pair',nonce,61])[0]==200
 assert scalar("SELECT watched FROM onboarding WHERE user_id='test-new'")==0
 for position in list(range(5,61,5))+[61]:
  run("UPDATE onboarding SET last_tick=%d WHERE user_id='test-new'"%(int(time.time()*1000)-4990))
  assert action('recordPlayback',['speech-pair',nonce,position])[0]==200
  assert scalar("SELECT watched FROM onboarding WHERE user_id='test-new'")==position
 wrong={**f,'partnerEmail':'new@example.test'};st,b,h=req('/projects/onboarding','new',wrong);assert st in (303,307) and 'error=application' in h.get('Location','')
 assert scalar("SELECT accepted_at FROM onboarding WHERE user_id='test-new'")==''
 st,b,h=req('/projects/onboarding','new',f);assert st in (303,307) and '/projects/work?id=speech-pair&launch=1' in h.get('Location',''),(st,h.get('Location'),b[:200])
 assert scalar("SELECT status FROM applications WHERE user_id='test-new'")=='pending'
 assert req('/projects/onboarding','new',f)[0] in (303,307)
 assert scalar("SELECT count(*) FROM applications WHERE user_id='test-new'")==1
 assert scalar("SELECT client_username FROM onboarding WHERE user_id='test-new'")=='new-client-id'
 # Pending contributors see concrete outstanding checks, without a client URL or auto launch ticket.
 st,b,_=req('/projects/work?id=speech-pair&launch=1','new');assert st==200 and 'Your client workspace is here.' in b and 'Permanent partner confirmation' in b and 'TL approval' in b and 'webrtcsg.shenfei-rec.com' not in b and '<iframe' not in b
 assert scalar("SELECT count(*) FROM launch_tickets WHERE user_id='test-new'")==0
 # Existing approved synthetic contributor gets a gated launch form and automatic launch component.
 run("UPDATE projects SET onboarding_required=0 WHERE id='speech-pair'")
 run("UPDATE applications SET created='%s' WHERE user_id='test-worker'"%ymd(0))
 st,b,_=req('/projects/work?id=speech-pair','worker');assert st==200 and 'data-client-launch="true"' in b and 'Opening your client sign-in inside this page' in b
 launch=form('/projects/work?id=speech-pair','Load client workspace','worker');assert req('/projects/launch','worker',{**launch,'mode':'embed'})[0]==303
 assert req('/projects/launch','worker',{**launch,'mode':'embed'})[0]==403
 print('PASS FLOW: no duplicate preview; portrait direct player; single tutorial/terms/application form; incomplete training and invalid partner rejected; pending remains pending; same-page blocker checklist hides client URL; approved desk autoload component; server-gated one-use launch retained. Synthetic local records only.')
finally:
 server.terminate();server.wait(timeout=10)
