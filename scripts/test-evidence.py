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
   if req('/')[0]==200:break
  except Exception:pass
  time.sleep(.5)
 else:raise Exception('Server did not start')
 run("update projects set target_start='%s',deadline='%s',active=1,evidence_required=1,onboarding_required=0,community_url='https://t.me/synthetic' where id='speech-pair'"%(ymd(-2),ymd(7)))
 for user,name,phone in [('tl','Evidence Leader','911111111111'),('tlother','Other Leader','912222222222')]:
  run("insert into participants(id,name,email,telegram,language,project,phone,phone_consent,created) values('test-%s','%s','%s@example.test','','Hindi','general','%s',1,'2026-01-01')"%(user,name,user,phone))
 run("update participants set phone='913333333333',phone_consent=1 where id in ('test-lead','test-partner')")
 for tid,lead in [('evidence-one','tl'),('evidence-two','tlother')]:
  run("insert into project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created) values('%s','speech-pair','test-%s','%s','%s-code',20000,20000,'test-owner','2026-01-01')"%(tid,lead,tid,tid))
 for user in ['lead','partner']:
  run("insert into team_members(project_id,user_id,team_id,rate_paise,base_rate_paise,joined) values('speech-pair','test-%s','evidence-one',20000,25000,'2026-01-01')"%user)
 run("update applications set partner_confirmed=1,community_verified=1,status='approved' where user_id='test-lead'")
 path='/teams/evidence?team=evidence-one'
 assert 'Permanent Partner' in req(path,'tl')[1]
 assert 'New Lead' not in req(path,'tlother')[1]
 assert 'Daily record from your TL' in req('/workspace/evidence','lead')[1]
 assert 'New Lead' not in req('/workspace/evidence?userId=test-lead','worker')[1]
 # Own-folder submission; no one can write another pair's record with captured forms.
 own=form('/workspace/evidence','Submit my folder for review','lead');own.update(projectId='speech-pair',leadId='test-lead',userId='test-lead',url='https://drive.google.com/drive/folders/SYNTHETIC_FIRST_123',permissions='yes')
 assert req('/workspace/evidence','worker',own)[0]>=400
 assert req('/workspace/evidence','lead',own,origin='https://evil.example')[0]>=400
 assert req('/workspace/evidence','lead',own)[0]==303
 second=form('/workspace/evidence','Submit my folder for review','partner');second.update(projectId='speech-pair',leadId='test-lead',userId='test-partner',url='https://drive.google.com/drive/u/0/folders/SYNTHETIC_FIRST_123?usp=sharing',permissions='yes')
 assert req('/workspace/evidence','partner',second)[0]>=400 # same physical folder, normalized URL
 second['url']='https://drive.google.com/drive/folders/SYNTHETIC_SECOND_123';assert req('/workspace/evidence','partner',second)[0]==303
 review=form(path,'Publish daily review','tl');review.update(teamId='evidence-one',leadId='test-lead',day=ymd(0),version='',attendance='worked',sections='2',minutes='7',firstShots='2',secondShots='2',sectionIds='S001\nS002',feedback='Both participants have complete section evidence.',checked='yes')
 review['sectionIds']='S001\nS002'.replace('\\n','\n')
 assert req(path,'tl',review)[0]>=400 # folder viewer access unverified
 for uid in ['test-lead','test-partner']:
  f=form(path,'Save &amp; record access check','tl');f.update(projectId='speech-pair',leadId='test-lead',userId=uid,teamId='evidence-one',version=scalar("select updated from evidence_folders where user_id='%s'"%uid),url=scalar("select url from evidence_folders where user_id='%s'"%uid),permissions='yes',verified='yes')
  assert req(path,'tlother',f)[0]>=400
  assert req(path,'tl',f)[0]==303
 assert req(path,'lead',review)[0]>=400
 assert req(path,'tlother',review)[0]>=400
 bad={**review,'secondShots':'1'};assert req(path,'tl',bad)[0]>=400
 bad={**review,'sectionIds':'S001\nS001'};assert req(path,'tl',bad)[0]>=400
 assert req(path,'tl',review)[0]==303
 assert scalar('select sections from pair_reviews')==2
 run("insert into managers(user_id,granted_by,created) values('test-worker','test-owner','2026-01-01')")
 assert '2 sections checked · 7 pair minutes' in req('/manager','worker')[1]
 assert req(path,'tl',review)[0]>=400 # stale update
 assert scalar("select count(*) from project_progress where user_id='test-lead'")==0 # no self-report changed or QC created
 assert 'Both participants have complete section evidence.' in req('/workspace/evidence','partner')[1]
 assert 'SYNTHETIC_SECOND_123' not in req('/workspace/evidence','lead')[1] # own folder only
 assert approved_launch('lead')[0]==303
 # Every configured tutorial is required; a forged primary-video completion is insufficient.
 run("update projects set onboarding_required=1,tutorial_seconds=10,tutorial_url='https://cdn.example.test/work.mp4',register_url='https://drive.google.com/file/d/SYNTHETIC_VIDEO/preview',intro_url='https://youtu.be/synthetic01',terms='Synthetic terms for required three-video project' where id='speech-pair'")
 def action(name,args,user='lead'):
  src=''.join(p.read_text() for p in pathlib.Path('dist/client').rglob('tutorial-player-*.js'))
  m=re.search(r'[`\"\']([^`\"\']+#'+name+r')[`\"\']',src);assert m,name
  headers={'oai-authenticated-user-id':'test-'+user,'oai-authenticated-user-email':user+'@example.test','Content-Type':'application/json','Origin':base,'Next-Action':m[1]}
  try:r=opener.open(U.Request(base+'/projects/onboarding?id=speech-pair',data=json.dumps(args).encode(),headers=headers),timeout=20)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read().decode()
 assert action('startTutorial',['speech-pair'])[0]==200
 run("update onboarding set watched=10 where user_id='test-lead'")
 accept=form('/projects/onboarding?id=speech-pair','Accept and continue','lead');accept.update(projectId='speech-pair',clientEmail='lead@example.test',clientUsername='synthetic-client-lead',terms='yes',inviteCode='IMCIAD')
 assert req('/projects/onboarding','lead',accept)[0]>=400
 verify=form('/admin/onboarding','Verify all required tutorial completion','owner');verify.update(userId='test-lead',projectId='speech-pair',note='Synthetic coordinator observed all required lessons for this test.')
 assert req('/admin/onboarding','owner',verify)[0]>=400 # unopened lessons cannot be silently verified
 for index in [1,2]:assert action('startTutorial',['speech-pair::lesson:'+str(index)])[0]==200
 assert req('/admin/onboarding','lead',verify)[0]>=400
 assert req('/admin/onboarding','owner',verify)[0]==303
 wrong={**accept,'inviteCode':'WRONG'};assert req('/projects/onboarding','lead',wrong)[0]>=400
 wrong={**accept,'clientEmail':'other@example.test'};assert req('/projects/onboarding','lead',wrong)[0]>=400
 assert req('/projects/onboarding','lead',accept)[0]==303
 assert approved_launch('lead')[0]==303
 run("update projects set invite_code='CHANGED' where id='speech-pair'")
 assert req('/projects/launch','lead',{'projectId':'speech-pair'})[0]==403
 run("update projects set invite_code='IMCIAD' where id='speech-pair'")
 # Scoped helpers are appointed only by management. No owner/staff powers are inherited.
 grant=form(path,'Save team permissions','owner');grant.update(teamId='evidence-one',userId='test-lead',review='yes');grant.pop('contact',None);grant.pop('tickets',None)
 assert req(path,'tl',grant)[0]>=400
 assert req(path,'owner',grant)[0]==303
 assert 'Permanent Partner' in req(path,'lead')[1]
 assert '913333333333' not in req(path,'lead')[1] # review permission does not imply contact
 assert '913333333333' not in req('/teams/contacts?team=evidence-one','lead')[1]
 assert 'Permanent Partner' not in req('/teams/evidence?team=evidence-two','lead')[1]
 assert req('/admin/payouts','lead')[0]!=200
 assert req('/teams/evidence/export?team=evidence-one','lead')[0]==403
 # Revocation takes effect on the next request.
 grant.pop('review',None);assert req(path,'owner',grant)[0]==303
 assert 'Permanent Partner' not in req(path,'lead')[1]
 # New production proof uploads: actual encrypted bytes, duplicates, scoped inspection and strict count gates.
 import io
 from PIL import Image
 def upload_shot(who,png,section='S001',origin=base):
  boundary='REAL_EVIDENCE_TEST';parts=[]
  for key,value in {'day':ymd(0),'sectionId':section,'consent':'yes'}.items():parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+value+'\r\n').encode())
  parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="screenshot"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+b'\r\n');parts.append(('--'+boundary+'--\r\n').encode());headers={'Content-Type':'multipart/form-data; boundary='+boundary,'Origin':origin,'oai-authenticated-user-id':'test-'+who,'oai-authenticated-user-email':who+'@example.test'}
  try:r=opener.open(U.Request(base+'/evidence/upload?project=speech-pair',data=b''.join(parts),headers=headers),timeout=30)
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read()
 run("update projects set uploads_required=1 where id='speech-pair'")
 strict=form(path,'Update daily review','tl');strict.update(attendance='worked',sections='2',minutes='7',firstShots='2',secondShots='2',sectionIds='S001\nS002',feedback='Checked real uploaded screenshots from both participants.',checked='yes')
 assert req(path,'tl',strict)[0]>=400
 payloads=[]
 for i,(who,section) in enumerate([('lead','S001'),('lead','S002'),('partner','S001'),('partner','S002')]):
  out=io.BytesIO();Image.new('RGB',(640,360),(30+i*25,60,100)).save(out,format='PNG');png=out.getvalue();payloads.append(png)
  assert upload_shot(who,png,section)[0]==303
 assert upload_shot('lead',payloads[0])[0]==409
 extra=io.BytesIO();Image.new('RGB',(640,360),(240,20,160)).save(extra,format='PNG');assert upload_shot('lead',extra.getvalue(),'S001')[0]==409
 assert upload_shot('worker',payloads[0])[0]==403
 assert upload_shot('lead',payloads[0],origin='https://evil.example')[0]==403
 bad_upload=upload_shot('lead',b'not-an-image'*8);assert bad_upload[0]==400,bad_upload
 ids=[]
 c=db();items=c.execute('select id,user_id from evidence_items').fetchall();c.close()
 for iid,uid in items:
  ids.append(iid)
  # Binary images are fetched with an isolated reader, never decoded as text.
  def file_status(who):
   headers={'oai-authenticated-user-id':'test-'+who,'oai-authenticated-user-email':who+'@example.test'}
   try:r=opener.open(U.Request(base+'/evidence/file?id='+iid,headers=headers),timeout=20)
   except urllib.error.HTTPError as e:r=e
   body=r.read();return r.status,body
  assert file_status(uid.removeprefix('test-'))[0]==200
  assert file_status('missing')[0]==403 and file_status('tlother')[0]==403
  page=req(path,'tl')[1];forms=re.findall(r'<form\b.*?</form>',page,re.S);rf=next(x for x in forms if ('value="'+iid+'"') in x and 'Save inspection' in x);data={htmlmod.unescape(re.search(r'name="([^"]+)"',i)[1]):htmlmod.unescape(re.search(r'value="([^"]*)"',i)[1] if re.search(r'value="([^"]*)"',i) else '') for i in re.findall(r'<input[^>]*>',rf) if re.search(r'name="([^"]+)"',i)};data.update(status='checked',note='Synthetic inspection confirms contributor, section and completion view.')
  assert req(path,'tlother',data)[0]>=400
  assert req(path,'tl',data)[0]==303
  assert req(path,'tl',data)[0]>=400
 strict=form(path,'Update daily review','tl');strict.update(attendance='worked',sections='2',minutes='7',firstShots='2',secondShots='2',sectionIds='S001\nS002',feedback='Checked actual uploaded screenshot records.',checked='yes');assert req(path,'tl',strict)[0]==303
 # Contact logs are scoped and TL daily counts come from unique recorded members.
 follow=form('/teams?team=evidence-one','Record follow-up','tl');follow.update(teamId='evidence-one',userId='test-lead',channel='phone',outcome='no-response',note='Synthetic call attempt was not answered.',nextAction='Try Telegram later today.');assert req('/teams','tlother',follow)[0]>=400;assert req('/teams','tl',follow)[0]==303
 daily=form('/teams?team=evidence-one','Submit daily TL report','tl');daily.update(teamId='evidence-one',summary='Reviewed evidence and recorded a member follow-up.',blockers='One member has not responded.',nextSteps='Follow up on Telegram.');assert req('/teams','tl',daily)[0]==303
 assert scalar("select contacted_count from leader_reports where team_id='evidence-one'")==1
 assert scalar("select unresponsive_count from leader_reports where team_id='evidence-one'")==1
 # Only owner can promote evidence to pending client reconciliation. No automatic earnings.
 reconcile=form(path,'Send to client-QC reconciliation','owner');assert req(path,'tl',reconcile)[0]>=400
 assert req(path,'owner',reconcile)[0]==303
 assert scalar("select review from project_progress where user_id='test-lead'")=='pending'
 assert scalar('select count(*) from earnings')==0
 latest=form(path,'Update daily review','tl');latest.update(attendance='worked',sections='2',minutes='7',firstShots='2',secondShots='2',sectionIds='S001\nS002',feedback='Changed after reconciliation should be blocked.',checked='yes')
 assert req(path,'tl',latest)[0]>=400
 # PAN-free banking and protected masks.
 bank=form('/workspace/payments','Save bank details','lead');bank.update(holder='Synthetic Lead',account='12345678901',confirm='12345678901',ifsc='TEST0123456',consent='yes');assert req('/workspace/payments','lead',bank)[0]==303
 assert scalar('select count(*) from identity_records')==0
 assert '12345678901' not in req('/workspace/payments','lead')[1]
 # Ticket deadline / closure retention. Overdue unresolved and recent closed content survive.
 for tid,status,closed in [('old-closed','closed','2020-01-01T00:00:00Z'),('old-open','open',''),('old-resolved','resolved',''),('recent-closed','closed',ymd(0)+'T00:00:00Z')]:
  run("insert into support_tickets(id,project_id,team_id,requester_id,subject,body,status,deadline,closed_at,created,updated) values('%s','speech-pair','evidence-one','test-lead','Synthetic ticket','Synthetic support content','%s','2020-01-01T00:00:00Z','%s','2020-01-01T00:00:00Z','2020-01-01T00:00:00Z')"%(tid,status,closed))
  run("insert into ticket_messages(id,ticket_id,actor,role,body,created) values('%s-message','%s','test-tl','team leader','Synthetic message','2020-01-01T00:00:00Z')"%(tid,tid))
 clean=form('/support','Run closed-ticket retention now','owner');assert req('/support','tl',clean)[0]>=400;assert req('/support','owner',clean)[0]==303
 assert scalar("select count(*) from support_tickets where id='old-closed'")==0
 assert scalar("select count(*) from ticket_messages where ticket_id='old-closed'")==0
 assert scalar('select count(*) from support_tickets')==3
 assert scalar('select count(*) from pair_reviews')==1
 assert scalar('select count(*) from bank_details')==1
 # Owner-directed escalations stay out of manager summaries.
 run("insert into support_tickets(id,project_id,team_id,requester_id,subject,body,status,route,private_escalation,created,updated) values('owner-only','speech-pair','evidence-one','test-partner','OWNER PRIVATE SUBJECT','Synthetic private site issue','open','owner',1,'2026-01-01','2026-01-01')")
 assert 'OWNER PRIVATE SUBJECT' not in req('/manager','worker')[1]
 assert 'OWNER PRIVATE SUBJECT' not in req('/support','worker')[1]
 assert 'OWNER PRIVATE SUBJECT' in req('/admin/dashboard','owner')[1]
 # Unattended retention surface accepts only authenticated owner identity, and rejects cross-origin writes.
 def mcp(user,origin=None):
  headers={'Content-Type':'application/json'}
  if user:headers.update({'oai-authenticated-user-id':'test-'+user,'oai-authenticated-user-email':user+'@example.test'})
  if origin:headers['Origin']=origin
  payload={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'purge_closed_support_tickets','arguments':{}}}
  try:r=opener.open(U.Request(base+'/mcp',data=json.dumps(payload).encode(),headers=headers),timeout=20)
  except urllib.error.HTTPError as e:r=e
  body=r.read().decode()
  if r.status==503 and 'worker restarted mid-request' in body:
   try:r=opener.open(U.Request(base+'/mcp',data=json.dumps(payload).encode(),headers=headers),timeout=30)
   except urllib.error.HTTPError as e:r=e
   body=r.read().decode()
  return r.status,body
 assert mcp(None)[0]==403 and mcp('tl')[0]==403
 assert mcp('owner','https://evil.example')[0]==403
 mcp_result=mcp('owner');assert mcp_result[0]==200,mcp_result
 run("update auth_limits set attempts=60 where key like 'upload:test-lead:%'");assert upload_shot('lead',payloads[0])[0]==429
 print('PASS evidence: pair/contributor isolation; canonical distinct Drive folders; manual viewer checks; per-person screenshot validation; cross-team/CSRF/stale rejection; scoped helper grants and revocation; owner-only QC reconciliation; no automatic earnings; all-video and mandatory invite-code gates; PAN-free bank onboarding; owner-only unattended retention; closed-only retention preserves overdue work and finance.')
finally:
 server.terminate();server.wait(timeout=10)
