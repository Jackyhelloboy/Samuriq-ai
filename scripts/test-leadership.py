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
 run("update projects set target_start='%s',deadline='%s',community_url='https://t.me/synthetic' where id='speech-pair'"%(ymd(0),ymd(7)))
 for user,name,phone in [('tlone','Leader One','911111111111'),('tltwo','Leader Two','912222222222'),('member','Member Alpha','913333333333'),('mate','Member Beta','914444444444'),('owner','Private Owner','919999999999')]:
  run("insert into participants(id,name,email,telegram,language,project,phone,phone_consent,created) values('test-%s','%s','%s@example.test','','Hindi','general','%s',1,'2026-01-01')"%(user,name,user,phone))
 grant=form('/admin/people','Appoint manager','owner');grant.update(userId='test-worker',grant='yes');assert req('/admin/people','owner',grant)[0]==303
 appoint=form('/admin/leaders','Appoint project TL','worker');appoint.update(projectId='speech-pair',leaderId='test-tlone',label='Synthetic Team One',model='direct');assert req('/admin/leaders','worker',appoint,origin='https://evil.example')[0]>=400;appointment=req('/admin/leaders','worker',appoint);assert appointment[0]==303,(appointment[0],appointment[1][:250])
 appoint['leaderId']='test-tltwo';appoint['label']='Synthetic Team Two';assert req('/admin/leaders','worker',appoint)[0]==303
 team1=scalar("select id from project_teams where leader_id='test-tlone'");team2=scalar("select id from project_teams where leader_id='test-tltwo'");code=scalar("select code from project_teams where id='%s'"%team1)
 assert req('/admin/leaders','tlone',appoint)[0]>=400
 assert req('/admin/leaders','tlone')[0]!=200
 assert req('/teams?team='+team2,'tlone')[0]!=200
 proposal=form('/teams?team='+team1,'Request owner approval','tlone');proposal.update(teamId=team1,hourlyRate='200');assert req('/teams','tlone',proposal)[0]==303
 review=form('/admin/leaders','Approve proposed rate','owner');review.update(teamId=team1,version='20000',decision='approve');assert req('/admin/leaders','worker',review)[0]>=400;assert req('/admin/leaders','owner',review)[0]==303
 for u in ['member','mate']:
  join=form('/teams/join?code='+code,'Accept rate and join team',u);join.update(code=code,rate='20000',consent='yes');assert req('/teams/join',u,join)[0]==303
 assert scalar('select count(*) from team_members')==2
 assert req('/teams/join','member',join)[0]>=400
 assert '911111111111' in req('/workspace','member')[1] and '912222222222' not in req('/workspace','member')[1]
 assert '913333333333' in req('/teams?team='+team1,'tlone')[1]
 assert '913333333333' not in req('/teams?team='+team2,'tltwo')[1]
 assert '919999999999' not in req('/admin/contacts','worker')[1]
 assert req('/admin/contacts','tlone')[0]!=200
 # Existing rate snapshots cannot be silently reduced.
 proposal['hourlyRate']='180';assert req('/teams','tlone',proposal)[0]==303
 review['version']='18000';assert req('/admin/leaders','owner',review)[0]==303
 assert scalar("select min(rate_paise) from team_members")==20000
 # Owner-only special export; TL cannot self-enable.
 special=form('/admin/leaders','Save special permission','owner');special.update(teamId=team1,export='yes')
 assert req('/admin/leaders','worker',special)[0]>=400
 assert req('/teams/export?team='+team1,'tlone')[0]==403
 assert req('/admin/leaders','owner',special)[0]==303
 st,csv,_=req('/teams/export?team='+team1,'tlone');assert st==200 and '913333333333' not in csv and '@example.test' not in csv
 assert req('/teams/export?team='+team2,'tlone')[0]==403
 # Private escalation remains hidden from the team leader.
 ticket=form('/support','Create ticket','member');ticket.update(teamId=team1,subject='Private synthetic concern',body='Synthetic private manager-only concern about this team.',private='yes');assert req('/support','member',ticket)[0]==303
 tid=scalar("select id from support_tickets where subject='Private synthetic concern'")
 assert 'Private synthetic concern' not in req('/support?ticket='+tid,'tlone')[1]
 assert 'Private synthetic concern' in req('/support?ticket='+tid,'worker')[1]
 task=form('/support','Create ticket','worker');task.update(teamId=team1,subject='Synthetic follow-up task',body='Please follow up with the assigned synthetic project members.');assert req('/support','worker',task)[0]==303
 taskid=scalar("select id from support_tickets where subject='Synthetic follow-up task'")
 reply=form('/support?ticket='+taskid,'Send response','tlone');reply.update(body='Synthetic follow-up completed and documented.',status='resolved');assert req('/support','tltwo',reply)[0]>=400
 bad={**reply,'status':'closed'};assert req('/support','tlone',bad)[0]>=400
 assert req('/support','tlone',reply)[0]==303
 close=form('/support?ticket='+taskid,'Send response','worker');close.update(body='Manager reviewed the resolution and confirmed completion.',status='closed');assert req('/support','worker',close)[0]==303
 daily=form('/teams?team='+team1,'Submit daily TL report','tlone');daily.update(teamId=team1,summary='Completed synthetic daily coordination and follow-up.',blockers='No blockers',nextSteps='Review tomorrow’s daily updates.');assert req('/teams','tltwo',daily)[0]>=400;assert req('/teams','tlone',daily)[0]==303
 assert scalar('select member_count from leader_reports')==2
 # Pair QC produces the correct individual pay plus separate TL commission.
 run("insert into applications(user_id,project_id,partner,partner_email,partner_confirmed,community_verified,experience,status,created) values('test-member','speech-pair','Member Beta','mate@example.test',1,1,'Synthetic','approved','%s')"%ymd(0))
 run("insert into project_progress(user_id,project_id,day,status,minutes,units,approved_minutes,notes,proof_url,review,review_note,updated) values('test-member','speech-pair','%s','completed',60,12,60,'Synthetic report','https://drive.google.com/file/d/synthetic','client-approved','Synthetic client QC','source-version')"%ymd(0))
 post=form('/admin/payouts','Post earnings','owner');post.update(userId='test-member',projectId='speech-pair',day=ymd(0));assert req('/admin/payouts','tlone',post)[0]>=400;assert req('/admin/payouts','owner',post)[0]==303
 assert scalar("select amount_paise from earnings where user_id='test-member'")==20000
 assert scalar("select sum(amount_paise) from earnings where user_id='test-tlone'")==10000
 assert scalar('select sum(amount_paise) from earnings')==50000
 assert req('/admin/payouts','owner',post)[0]>=400 and scalar('select count(*) from earnings')==4
 rep=form('/workspace','Save daily update','member');rep.update(projectId='speech-pair',status='completed',minutes='120',units='20',proofUrl='https://drive.google.com/file/d/synthetic',notes='Synthetic change');assert req('/workspace','member',rep)[0]>=400
 assert scalar("select minutes from project_progress where user_id='test-member'")==60
 assert 'Member Beta' not in req('/workspace/earnings','member')[1]
 assert req('/workspace/earnings','member')[0]!=200
 # Payout orders require owner access, reviewed identity, bank checks and a unique earning.
 run("insert into identity_records(user_id,pan_hash,document_hash,encrypted,pan_last4,status,document_key,document_type,updated) values('test-member','synthetic-hash','synthetic-doc','fixture','000X','manual-reviewed','fixture','image/png','2026-01-01')")
 bank=form('/workspace/payments','Save bank details','member');bank.update(holder='Synthetic Member',account='12345678901',confirm='12345678901',ifsc='TEST0123456',consent='yes');assert req('/workspace/payments','member',bank)[0]==303
 run("update earnings set day='2026-01-01'")
 prep=form('/admin/payouts','Prepare payout','owner');prep.update(earningId=scalar("select id from earnings where user_id='test-member'"),bankChecked='yes');assert req('/admin/payouts','worker',prep)[0]>=400;assert req('/admin/payouts','owner',prep)[0]==303
 assert req('/admin/payouts','owner',prep)[0]>=400
 orderid=scalar('select id from payout_orders')
 manual=form('/admin/payouts','Record payment','owner');manual.update(orderId=orderid,reference='SYNTHETIC-UTR-ONLY',confirmed='yes');assert req('/admin/payouts','tlone',manual)[0]>=400;assert req('/admin/payouts','owner',manual)[0]==303
 assert scalar('select status from payout_orders')=='paid';assert req('/admin/payouts','owner',manual)[0]>=400
 assert 'SYNTHETIC-UTR-ONLY' not in req('/workspace/earnings','member')[1]
 assert '12345678901' not in req('/workspace/earnings','member')[1]
 assert req('/admin/payouts','worker')[0]!=200
 # Managers can restrict contributors; TLs cannot. Restriction takes effect on every authenticated request.
 restrict=form('/admin/leaders','Apply restriction','worker');restrict.update(userId='test-member',suspended='1',note='Synthetic access restriction test');assert req('/admin/leaders','tlone',restrict)[0]>=400;assert req('/admin/leaders','worker',restrict)[0]==303
 assert 'SYNTHETIC-UTR-ONLY' not in req('/workspace/earnings','member')[1]
 for path in ['/admin/leaders','/admin/contacts','/admin/payouts','/teams?team='+team1,'/support']:
  assert req(path,'owner')[0]==200,path
 print('PASS leadership: project-scoped roles; owner-only rates/special rights; frozen member rates; private escalations; TL resolution and manager closure; consented phone scoping; daily TL reports; exact pair earnings and commission; ledger lock; unique owner payout; suspension; owner pages render. No real payment or provider request was made.')
finally:
 server.terminate();server.wait(timeout=10)
