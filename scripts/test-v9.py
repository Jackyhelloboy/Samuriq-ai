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
 run("update projects set active=1,archived_at='',enrollment_only=0,pair=1,hourly_rate=500,target_minutes=60,evidence_required=0,onboarding_required=0,target_start='%s',deadline='%s' where id='speech-pair'"%(ymd(-7),ymd(7)))
 run("insert into projects(id,title,category,description,requirements,client_url,invite_code,active,visibility,onboarding_required,hourly_rate,created) values('second','Second vendor project','Annotation','Synthetic project','Follow instructions','https://client.example.test/','TEST',1,'listed',0,250,'2026-01-01')")
 for u in ['vendorone','vendortwo','alice','bob','charlie']:
  run("insert into participants(id,name,email,telegram,language,project,phone,phone_consent,created) values('test-%s','Synthetic %s','%s@example.test','','Hindi','general','+910000000000',1,'2026-01-01')"%(u,u,u))
 run("insert into managers(user_id,granted_by,created) values('test-worker','test-owner','2026-01-01')")
 offer='Synthetic Vendor pays you INR 180 per approved hour, within seven days of receiving its settlement. Contact the vendor for payroll disputes.'
 appoint=form('/admin/leaders','Appoint project TL','worker');appoint.update(projectId='speech-pair',leaderId='test-vendorone',label='Synthetic Vendor One',model='vendor',payrollTerms=offer)
 assert req('/admin/leaders','worker',appoint)[0]==303
 first=scalar("select id from project_teams where leader_id='test-vendorone'");code=scalar("select code from project_teams where id='%s'"%first)
 assert scalar("select vendor_target_minutes from project_teams where id='%s'"%first)==60
 appoint.update(leaderId='test-vendortwo',label='Synthetic Vendor Two');assert req('/admin/leaders','worker',appoint)[0]==303
 second=scalar("select id from project_teams where leader_id='test-vendortwo'")
 # Editing an existing project cannot retroactively change a vendor contract's period or upstream budget.
 contract_edit=form('/admin/projects/edit?id=speech-pair','Save project','owner');contract_edit.update(id='speech-pair',title='Synthetic protected contract',description='Synthetic immutable financial-period check',targetHours='1',hourlyRate='999',targetStart=ymd(-7),deadline=ymd(7),tutorialSeconds='10',tutorialUrl='https://example.test/lesson.mp4',terms='Synthetic clear agreement for the project',pair='yes',active='0',listed='yes',onboardingRequired='yes')
 st,body,h=req('/admin/projects/edit','owner',contract_edit);assert st>=400
 assert scalar("select hourly_rate from projects where id='speech-pair'")==500
 contract_edit['hourlyRate']='500';assert req('/admin/projects/edit','owner',contract_edit)[0]==303
 run("update projects set active=1,archived_at='',onboarding_required=0,evidence_required=0,enrollment_only=0 where id='speech-pair'")
 # Neither the owner contract rate nor another vendor's data appears in vendor invitations/views.
 for u in ['alice','bob']:
  st,b,h=req('/teams/join?code='+code,u);assert st==200 and 'Vendor-managed payroll'.lower() in b.lower()
  assert '250.00' not in b and 'value="25000"' not in b and 'INR 180' in b
  join=form('/teams/join?code='+code,'Accept rate and join team',u);join.update(code=code,consent='yes')
  assert 'rate' not in join and len(join['termsVersion'])==64
  assert req('/teams/join',u,join)[0]==303
 assert scalar("select count(*) from team_members where vendor_payee='test-vendorone'")==2
 assert req('/teams?team='+second,'vendorone')[0]!=200
 b=req('/teams?team='+first,'vendorone')[1];assert 'Private contributor payroll offer' in b and 'value="25000"' not in b
 # Updating a vendor default must not alter accepted private agreements.
 terms=form('/teams?team='+first,'Save private payroll terms','vendorone');terms.update(teamId=first,payrollTerms=offer.replace('180','190'))
 assert req('/teams','vendortwo',terms)[0]>=400
 assert req('/teams','vendorone',terms)[0]==303
 assert 'INR 180' in scalar("select payroll_terms from team_members where user_id='test-alice'")
 run("insert into applications(user_id,project_id,partner,partner_email,partner_confirmed,community_verified,experience,status,created) values('test-alice','speech-pair','Synthetic bob','bob@example.test',1,1,'Synthetic','approved','%s')"%ymd(-7))
 for day in [ymd(-1)]:
  run("insert into project_progress(user_id,project_id,day,status,minutes,units,approved_minutes,notes,proof_url,review,review_note,updated) values('test-alice','speech-pair','%s','completed',30,5,30,'Synthetic','https://drive.google.com/file/d/synthetic','client-approved','Synthetic QC','%s')"%(day,day))
 # Effective vendor contract needs to cover those work dates; this fixture tests a pre-agreed period.
 run("update team_members set vendor_from='%s' where team_id='%s'"%(ymd(-7),first))
 post=form('/admin/payouts','Post earnings','owner');post.update(userId='test-alice',projectId='speech-pair',day=ymd(-1))
 assert req('/admin/payouts','owner',post)[0]>=400
 assert scalar('select count(*) from earnings')==0
 run("insert into project_progress(user_id,project_id,day,status,minutes,units,approved_minutes,notes,proof_url,review,review_note,updated) values('test-alice','speech-pair','%s','completed',30,5,30,'Synthetic','https://drive.google.com/file/d/synthetic','client-approved','Synthetic QC','%s')"%(ymd(0),ymd(0)))
 assert req('/admin/payouts','worker',post)[0]>=400
 assert req('/admin/payouts','owner',post)[0]==303
 assert scalar("select count(*) from earnings where user_id='test-vendorone'")==2
 assert scalar("select count(*) from earnings where user_id in ('test-alice','test-bob')")==0
 assert scalar("select sum(amount_paise) from earnings")==25000
 post['day']=ymd(0)
 import concurrent.futures
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:result=list(pool.map(lambda _:req('/admin/payouts','owner',dict(post))[0],range(2)))
 assert result.count(303)==1,result
 assert scalar("select sum(amount_paise) from earnings")==50000
 assert scalar("select count(*) from earnings where kind like 'commission:%'")==0
 assert scalar("select count(*) from earnings where kind like 'vendor-work:%'")==4
 # A direct individual's approved work remains payable to that person.
 run("insert into applications(user_id,project_id,partner,experience,status,community_verified,created) values('test-charlie','second','','Synthetic','approved',1,'2026-01-01')")
 run("insert into project_progress(user_id,project_id,day,status,minutes,units,approved_minutes,notes,review,review_note,updated) values('test-charlie','second','2026-01-01','completed',60,5,60,'Synthetic','client-approved','Synthetic QC','test-direct')")
 post.update(userId='test-charlie',projectId='second',day='2026-01-01');assert req('/admin/payouts','owner',post)[0]==303
 assert scalar("select amount_paise from earnings where user_id='test-charlie'")==25000
 # Vendor's own bank profile is used for its settlement. Its members' banking is never shared.
 bank=form('/workspace/payments','Save bank details','vendorone');bank.update(holder='Synthetic Vendor',account='12345678901',confirm='12345678901',ifsc='TEST0123456',consent='yes');assert req('/workspace/payments','vendorone',bank)[0]==303
 assert '12345678901' not in req('/teams?team='+first,'vendorone')[1]
 assert req('/admin/payouts','vendorone')[0]!=200
 assert req('/workspace/earnings','alice')[0]!=200
 # One month-end vendor bank order claims all source lines atomically, without duplicate payroll.
 run("update earnings set day='2026-01-'||substr(day,9,2) where kind like 'vendor-work:%'")
 monthly=form('/admin/payouts','Prepare monthly vendor payout','owner');monthly.update(vendorId='test-vendorone',month='2026-01',bankChecked='yes')
 assert req('/admin/payouts','vendorone',monthly)[0]>=400
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:prepared=list(pool.map(lambda _:req('/admin/payouts','owner',dict(monthly))[0],range(2)))
 assert prepared.count(303)==1,prepared
 assert scalar('select count(*) from payout_orders')==1
 assert scalar('select count(*) from payout_items')==4
 assert scalar('select amount_paise from payout_orders')==50000
 single=form('/admin/payouts','Prepare payout','owner');single.update(earningId=scalar("select id from earnings where kind like 'vendor-work:%' limit 1"),bankChecked='yes')
 assert req('/admin/payouts','owner',single)[0]>=400
 assert scalar('select count(*) from payout_orders')==1
 assert 'Monthly vendor transfer controls' in req('/admin/payouts','owner')[1]
 # TL is single-project by default; only management may grant and revoke the exception.
 appoint.update(projectId='second',leaderId='test-vendorone',label='Vendor second assignment');assert req('/admin/leaders','worker',appoint)[0]>=400
 policy=form('/admin/vendors','Save management assignment policy','worker');policy.update(userId='test-vendorone',maxProjects='2',reason='Synthetic authorized second client project coverage.')
 assert req('/admin/vendors','vendorone',policy)[0]>=400
 assert req('/admin/vendors','worker',policy)[0]==303
 assert req('/admin/leaders','worker',appoint)[0]==303
 extra=scalar("select id from project_teams where leader_id='test-vendorone' and project_id='second'")
 assert req('/teams?team='+extra,'vendorone')[0]==200
 policy['maxProjects']='1';assert req('/admin/vendors','worker',policy)[0]==303
 assert req('/teams?team='+extra,'vendorone')[0]!=200
 assert 'permission is not assigned' in req('/teams/contacts?team='+extra,'vendorone')[1]
 # Community redirect is server gated, never a shortcut around required videos.
 run("update projects set onboarding_required=1,community_url='https://t.me/synthetic_only',tutorial_url='https://example.test/lesson.mp4',terms='Synthetic required project agreement',enrollment_only=0 where id='speech-pair'")
 b=req('/projects/community?id=speech-pair','alice')[1];assert 'Finish your project training.' in b and 'https://t.me/synthetic_only' not in b
 workflow=form('/admin/projects/workflow?id=speech-pair','Save workflow','worker');workflow.update(projectId='speech-pair',tutorialUrl='https://example.test/lesson.mp4',communityUrl='https://t.me/synthetic_only',terms='Synthetic required project agreement',tutorialSeconds='10')
 assert req('/admin/projects/workflow','worker',workflow)[0]==303
 assert scalar("select enrollment_only from projects where id='speech-pair'")==0
 run("update projects set onboarding_required=0 where id='speech-pair'")
 st,b,h=req('/projects/community?id=speech-pair','alice');assert st in (303,307) and h.get('Location')=='https://t.me/synthetic_only'
 run("update projects set enrollment_only=1,community_url='' where id='speech-pair'")
 assert 'management must finish tutorial and Telegram setup' in req('/projects/work?id=speech-pair','alice')[1]
 assert 'ENROLLMENT OPEN' in req('/projects',None)[1]
 # Readiness/crawler endpoints contain no private URLs, bank details or people records.
 st,b,h=req('/api/project-readiness',None);assert st==200 and json.loads(b)['workReady']==False and 'client.example' not in b
 assert req('/robots.txt',None)[0]==200 and req('/sitemap.xml',None)[0]==200
 for role in ['owner','manager','tl','helper','contributor']:
  st,b,h=req('/demo?role='+role,None);assert st==200 and 'Workspace V10' in b
  if role!='owner':assert '₹1,250' not in b
 # Scoped SQL and pagination: synthetic local concurrency, not a production capacity promise.
 start=time.monotonic()
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:status=list(pool.map(lambda _:req('/teams?team='+first,'vendorone')[0],range(100)))
 assert all(s==200 for s in status),status
 assert scalar("select count(*) from payout_orders where status='paid'")==0
 print('PASS V9: vendor/direct beneficiary separation; INR250/person owner budget; target-gated client-QC settlements; no double payroll or commission; atomic duplicate posting denial and one vendor-month order; frozen private offers; owner-private finance/bank; cross-vendor isolation; management-only second project and revocation; gated community; enrollment-only safety; role demos; readiness/crawler routes; 100 scoped local team requests across eight workers in %.2fs (not a production capacity guarantee).'%(time.monotonic()-start))
finally:
 server.terminate();server.wait(timeout=10)
