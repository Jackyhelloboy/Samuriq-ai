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
 run("update projects set active=1,archived_at='',pair=0,hourly_rate=250,evidence_required=0,onboarding_required=0,visibility='listed',target_start='%s',deadline='%s' where id='speech-pair'"%(ymd(0),ymd(7)))
 run("insert into projects(id,title,category,description,requirements,client_url,invite_code,active,visibility,onboarding_required,hourly_rate,created) values('second','Second test project','Annotation','Synthetic project','Follow instructions','https://client.example.test/','TEST',1,'listed',0,250,'2026-01-01')")
 for u in ['tlone','tltwo','referred','helper','free']+['d'+str(i) for i in range(8)]:
  run("insert into participants(id,name,email,telegram,language,project,phone,phone_consent,created) values('test-%s','Synthetic %s','%s@example.test','','Hindi','general','+910000000000',1,'2026-01-01')"%(u,u,u))
 run("insert into managers(user_id,granted_by,created) values('test-worker','test-owner','2026-01-01')")
 for t,l in [('team-one','tlone'),('team-two','tltwo')]:
  run("insert into project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created) values('%s','speech-pair','test-%s','%s','code-%s',25000,25000,'test-owner','2026-01-01')"%(t,l,t,t))
 # Shared public links need no authentication; production amounts remain owner-private.
 for role in ['owner','manager','tl','helper','contributor']:
  status,b,h=req('/demo?role='+role,None);assert status==200 and 'Workspace V10' in b and 'Interactive demo.' in b
  if role!='owner':assert 'Posted QC earnings' not in b and '₹1,250' not in b
 assert 'fictional' in req('/demo?role=tl',None)[1].lower()
 assert 'No password is required' in req('/demo/login',None)[1]
 for u in ['worker','tlone','helper','referred']:
  assert req('/workspace/earnings',u)[0]!=200
  assert req('/admin/payouts',u)[0]!=200
  assert req('/admin/payments/reveal?userId=test-referred',u)[0]!=200
 assert req('/workspace/earnings','owner')[0] in (303,307)
 # Referral stays pinned to that team.
 f=form('/teams/join?code=code-team-two','Accept rate and join team','referred');f.update(code='code-team-two',rate='25000',consent='yes')
 assert req('/teams/join','referred',f)[0]==303
 assert scalar("select team_id from team_members where user_id='test-referred'")=='team-two'
 # Registered direct applicants balance in one atomic insert.
 template=form('/projects/detail?id=speech-pair','Submit application','d0');template.update(projectId='speech-pair',communityHandle='synthetic_user',experience='Synthetic availability and qualifications',consent='yes')
 import concurrent.futures
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:statuses=list(pool.map(lambda n:req('/projects/detail','d'+str(n),dict(template))[0],range(8)))
 assert all(s==303 for s in statuses),statuses
 counts=[scalar("select count(*) from team_members where team_id='%s'"%t) for t in ['team-one','team-two']]
 assert abs(counts[0]-counts[1])<=1,counts
 assert scalar("select rate_accepted from team_members where user_id='test-d0'")==0
 assert 'Accept your assigned team terms' in req('/workspace','d0')[1]
 consent=form('/projects/detail?id=speech-pair','Accept assigned team terms','d0');consent.update(projectId='speech-pair',rate='25000',consent='yes')
 assert req('/projects/detail','d1',consent)[0]==303 # acts only on the authenticated account
 assert scalar("select rate_accepted from team_members where user_id='test-d0'")==0
 assert req('/projects/detail','d0',consent)[0]==303
 assert scalar("select rate_accepted from team_members where user_id='test-d0'")==1
 # TLs cannot join each other's team, even with a captured join action.
 assert req('/teams/join','tlone',f)[0]>=400
 assert req('/teams?team=team-two','tlone')[0]!=200
 assert '+910000000000' in req('/teams?team=team-two','tltwo')[1]
 # Current-team users need their actual TL's authorization for another project.
 other=form('/projects/detail?id=second','Submit application','free');other.update(projectId='second',communityHandle='synthetic_user',experience='Synthetic qualifications',consent='yes')
 assert req('/projects/detail','d0',other)[0]>=400
 assert scalar("select count(*) from applications where project_id='second' and user_id='test-d0'")==0
 permission=form('/projects/detail?id=second','Request TL permission','d0');permission.update(projectId='second',reason='I can manage both project commitments responsibly.')
 assert req('/projects/detail','d0',permission)[0]==303
 team=scalar("select team_id from team_members where user_id='test-d0'");leader='tlone' if team=='team-one' else 'tltwo';wrong='tltwo' if leader=='tlone' else 'tlone'
 approval=form('/teams?team='+team,'Approve application',leader);approval.update(teamId=team,userId='test-d0',projectId='second',decision='approved')
 assert req('/teams',wrong,approval)[0]>=400
 assert req('/teams',leader,approval)[0]==303
 assert req('/projects/detail','d0',other)[0]==303
 # Non-team users remain free to apply. No eligible team -> management assignment pending.
 assert req('/projects/detail','free',other)[0]==303
 # Scoped helper dashboard and revoked memberships.
 run("insert into team_members(project_id,user_id,team_id,rate_paise,base_rate_paise,joined) values('speech-pair','test-helper','team-one',25000,25000,'2026-01-01')")
 run("insert into team_helpers(team_id,user_id,scopes,granted_by,created) values('team-one','test-helper','contact,tickets','test-owner','2026-01-01')")
 b=req('/helper','helper')[1];assert 'Your team support desk.' in b and 'team-one' in b and 'team-two' not in b
 assert req('/teams?team=team-one','helper')[0]!=200
 assert 'permission is not assigned to you' in req('/teams/contacts?team=team-two','helper')[1]
 run("delete from team_helpers where user_id='test-helper'")
 assert 'Your team support desk.' not in req('/helper','helper')[1]
 # Owner-only workflow configuration and server validation of typed client reports.
 workflow=form('/admin/workflows?project=second','Save contributor workflow','owner');workflow.update(projectId='second',workType='annotation',workInstructions='Label the frames and report the client batch reference.')
 assert req('/admin/workflows','worker',workflow)[0]>=400
 assert req('/admin/workflows','owner',workflow)[0]==303
 assert scalar("select work_type from projects where id='second'")=='annotation'
 run("update applications set status='approved',community_verified=1 where user_id='test-d0' and project_id='second'")
 b=req('/workspace?project=second','d0')[1];assert 'Assets labeled' in b and 'client batch reference' in b
 daily=form('/workspace?project=second','Save daily update','d0');daily.update(projectId='second',status='completed',minutes='15',units='8',proofUrl='https://drive.google.com/file/d/synthetic',notes='Synthetic report')
 assert req('/workspace','d0',daily)[0]>=400
 daily['clientId']='BATCH-SYNTHETIC';assert req('/workspace','d0',daily)[0]==303
 # Announcements use the same shell for all real roles.
 announce=form('/admin/announcements','Publish announcement','owner');announce.update(title='Synthetic monthly update',body='Client-approved work is settled at month end.')
 assert req('/admin/announcements','owner',announce)[0]==303
 for u,path in [('d0','/workspace'),('tlone','/teams?team=team-one'),('worker','/manager')]:assert 'Synthetic monthly update' in req(path,u)[1]
 # Month-end policy cannot be bypassed using a captured payout action.
 bank=form('/workspace/payments','Save bank details','d0');bank.update(holder='Synthetic Person',account='12345678901',confirm='12345678901',ifsc='TEST0123456',consent='yes');assert req('/workspace/payments','d0',bank)[0]==303
 today=ymd(0)
 run("insert into earnings(id,source_user_id,project_id,day,user_id,kind,minutes,rate_paise,amount_paise,source_version,created) values('future-earning','test-d0','second','2099-01-01','test-d0','work',60,25000,25000,'test','2026-01-01')")
 payout=form('/admin/payouts','Prepare payout','owner');payout.update(earningId='future-earning',bankChecked='yes')
 assert req('/admin/payouts','owner',payout)[0]>=400
 run("update earnings set day='2026-01-01' where id='future-earning'")
 assert req('/admin/payouts','worker',payout)[0]>=400
 assert req('/admin/payouts','owner',payout)[0]==303
 assert scalar('select count(*) from payout_orders')==1
 assert 'future-earning' not in req('/workspace','d0')[1]
 assert '₹250.00' not in req('/admin/team','worker')[1]
 # Concurrent attempts at two projects cannot bypass the current-team permission gate.
 run("insert into participants(id,name,email,telegram,language,project,phone,phone_consent,created) values('test-race','Synthetic Race','race@example.test','','Hindi','general','+910000000000',1,'2026-01-01')")
 run("insert into project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created) values('second-team','second','test-tlone','Second team','second-code',25000,25000,'test-owner','2026-01-01')")
 run("insert into leader_policies(user_id,max_projects,approved_by,reason,updated) values('test-tlone',2,'test-owner','Synthetic authorized second assignment','2026-01-01')")
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  racing=list(pool.map(lambda project:req('/projects/detail','race',{**template,'projectId':project})[0],['speech-pair','second']))
 assert sorted(racing)==[303,500],racing
 assert scalar("select count(*) from team_members where user_id='test-race'")==1
 assert scalar("select count(*) from applications where user_id='test-race'")==1
 # Closure archives operational views, never deletes participant/payment history.
 close=form('/admin/projects','Close project','owner');close.update(id='second',active='0')
 assert req('/admin/projects','owner',close)[0]==303
 assert scalar("select length(archived_at) from projects where id='second'")>0
 assert 'Label the frames and report the client batch reference.' not in req('/workspace?project=second','d0')[1]
 assert scalar("select count(*) from participants where id='test-d0'")==1
 assert scalar("select count(*) from project_progress where project_id='second'")==1
 assert scalar('select count(*) from payout_orders')==1
 assert req('/workspace','d0',daily)[0]>=400
 assert 'Share Second test project' not in req('/projects',None)[1]
 print('PASS V8: owner-private earnings and bank access; monthly settlement enforcement; atomic balanced assignment; referral pinning; rate acceptance; TL cross-team denial; additional-project approval; scoped/revoked helper access; typed workflow validation; universal announcements; archive retention; five isolated role demos. No real payment or client request was made.')
finally:
 server.terminate();server.wait(timeout=10)
