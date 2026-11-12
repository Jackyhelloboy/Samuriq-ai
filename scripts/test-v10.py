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


def agree(u,role='contributor'):
 f=form('/agreements?role='+role,'Accept current agreement',u);f.update(consent='yes',duties='yes');assert req('/agreements',u,f)[0]==303
def expiry():
 import datetime;return (datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=5,minutes=30,days=1)).strftime('%Y-%m-%dT%H:%M')
try:
 for i in range(60):
  try:
   if req('/')[0]==200:break
  except Exception:pass
  time.sleep(.5)
 else:raise Exception('Server did not start')
 st,b,h=req('/admin/dashboard','owner');assert st in (303,307) and '/agreements' in h.get('Location','')
 agree('owner','owner');assert scalar("select length(content_hash) from policy_acceptances where user_id='test-owner' and role='owner'")==64
 run("insert into managers(user_id,granted_by,created) values('test-worker','test-owner','2026-01-01')");agree('worker','manager')
 run("update projects set uploads_required=0,active=1,archived_at='',enrollment_only=0,pair=1,hourly_rate=500,target_minutes=840,evidence_required=1,onboarding_required=0,target_start='%s',deadline='%s' where id='speech-pair'"%(ymd(-7),ymd(7)))
 for i,u in enumerate(['tlone','tltwo','tlthree','vendor','alice','bob','mallory','outsider']):
  run("insert into participants(id,name,email,telegram,language,project,phone,phone_consent,created) values('test-%s','Synthetic %s','%s@example.test','synthetic_user','Hindi','speech','+91000000%04d',1,'2026-01-01')"%(u,u,u,i+1))
 bad=form('/agreements?role=contributor','Accept current agreement','outsider');bad.update(role='owner',consent='yes',duties='yes');assert req('/agreements','outsider',bad)[0]>=400
 for u in ['alice','bob','mallory','outsider']:agree(u)
 appoint=form('/admin/leaders','Appoint project TL','worker');appoint.update(projectId='speech-pair',model='direct');teams={}
 for u in ['tlone','tltwo','tlthree']:
  appoint.update(leaderId='test-'+u,label='Synthetic '+u);assert req('/admin/leaders','worker',appoint)[0]==303
  teams[u]=scalar("select id from project_teams where leader_id='test-%s'"%u)
 legacy=scalar("select code from project_teams where id='%s'"%teams['tlone']);assert 'invitation is unavailable' in req('/teams/join?code='+legacy,'alice')[1]
 create=form('/teams?team='+teams['tlone'],'Create expiring invitation','owner');create.update(teamId=teams['tlone'],expiresAt=expiry(),maxUses='2')
 assert req('/teams','tlone',create)[0]>=400 and scalar('select count(*) from team_invites')==0
 for u in ['tlone','tltwo','tlthree']:agree(u,'tl')
 assert req('/teams','tlone',create)[0]==303
 invite=scalar('select id from team_invites');code=scalar('select code from team_invites')
 join=form('/teams/join?code='+code,'Accept rate and join team','alice');join.update(code=code,rate='25000',consent='yes');assert req('/teams/join','alice',join)[0]==303
 import concurrent.futures
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:out=list(pool.map(lambda u:(u,req('/teams/join',u,dict(join))[0]),['bob','mallory']))
 winners=[u for u,st in out if st==303];assert len(winners)==1,out
 partner=winners[0];assert scalar('select used from team_invites')==2 and scalar('select count(*) from team_members')==2
 assert req('/teams/join','alice',join)[0]>=400 and scalar('select used from team_invites')==2
 update=form('/teams?team='+teams['tlone'],'Update invitation limits','tlone');update.update(teamId=teams['tlone'],inviteId=invite,expiresAt=expiry(),maxUses='3')
 assert req('/teams','tltwo',update)[0]>=400;assert req('/teams','tlone',update)[0]==303
 update['maxUses']='1';assert req('/teams','tlone',update)[0]>=400
 revoke=form('/teams?team='+teams['tlone'],'Revoke invitation','tlone');revoke.update(teamId=teams['tlone'],inviteId=invite,revoke='yes');assert req('/teams','tlone',revoke)[0]==303
 assert req('/teams/join','outsider',join)[0]>=400 and scalar('select used from team_invites')==2
 assert req('/teams','tlone',create)[0]==303
 expired=scalar("select id from team_invites where revoked_at='' limit 1");expiredCode=scalar("select code from team_invites where id='%s'"%expired);run("update team_invites set expires_at=1 where id='%s'"%expired)
 assert req('/teams/join','outsider',{**join,'code':expiredCode})[0]>=400
 for i,u in enumerate(['dave','eve']):
  f=form('/workspace?next=speech-pair','Save my profile',u);f.update(name='Synthetic '+u,telegram='synthetic_'+u,language='Hindi',project='speech',phone='+91000000900'+str(i),phoneConsent='yes',consent='yes',platformPolicyConsent='yes',next='speech-pair');assert req('/workspace',u,f)[0]==303
 counts=[scalar("select count(*) from team_members where team_id='%s'"%teams[u]) for u in ['tlone','tltwo','tlthree']];assert max(counts)-min(counts)<=1,counts
 assert scalar("select length(content_hash) from policy_acceptances where user_id='test-dave' and role='contributor'")==64
 run("update team_members set joined='%sT00:00:00Z',effective_from='%s' where team_id='%s'"%(ymd(-7),ymd(-7),teams['tlone']))
 run("insert into applications(user_id,project_id,partner,partner_email,partner_confirmed,community_verified,experience,status,created) values('test-alice','speech-pair','Synthetic partner','%s@example.test',1,1,'Synthetic','approved','%s')"%(partner,ymd(-7)))
 for u in ['alice',partner]:run("insert into evidence_folders(project_id,user_id,lead_id,url,verified_by,updated) values('speech-pair','test-%s','test-alice','https://drive.google.com/drive/folders/SYNTHETIC_%s_FOLDER','test-tlone','fixture')"%(u,u))
 run("insert into team_helpers(team_id,user_id,scopes,granted_by,created) values('%s','test-alice','contact','test-owner','2026-01-01')"%teams['tlone']);agree('alice','helper')
 run("insert into launch_tickets(hash,user_id,project_id,expires) values('synthetic-revoked','test-alice','speech-pair',4070908800000)")
 transfer=form('/admin/transfers?project=speech-pair','Request recorded team transfer','worker');transfer.update(projectId='speech-pair',userId='test-alice',targetTeamId=teams['tltwo'],reason='Synthetic operational reassignment for improved daily follow-up.',confirmed='yes')
 assert req('/admin/transfers','tlone',transfer)[0]>=400;assert req('/admin/transfers','worker',transfer)[0]==303
 assert scalar("select count(*) from team_members where user_id in ('test-alice','test-%s') and team_id='%s'"%(partner,teams['tltwo']))==2
 assert scalar('select count(*) from membership_history')==2
 assert scalar("select count(*) from team_helpers where user_id='test-alice'")==0 and scalar("select count(*) from launch_tickets where user_id='test-alice'")==0
 assert scalar("select count(*) from evidence_folders where verified_by<>''")==0
 phone=scalar("select phone from participants where id='test-alice'");assert phone not in req('/teams?team='+teams['tlone'],'tlone')[1];assert phone in req('/teams?team='+teams['tltwo'],'tltwo')[1]
 appoint.update(leaderId='test-vendor',label='Synthetic vendor',model='vendor',payrollTerms='Synthetic private vendor payroll agreement with individual rates, timing and dispute contact.');assert req('/admin/leaders','worker',appoint)[0]==303
 vendorTeam=scalar("select id from project_teams where leader_id='test-vendor'");agree('vendor','tl')
 transfer.update(targetTeamId=vendorTeam,reason='Synthetic prospective vendor handover preserving prior approved work.');assert req('/admin/transfers','worker',transfer)[0]==303
 tid=scalar("select id from team_transfers where status='pending-owner'");assert scalar("select team_id from team_members where user_id='test-alice'")==teams['tltwo']
 approval=form('/admin/transfers','Approve prospective transfer','owner');approval.update(transferId=tid,targetHours='14',honorPriorQc='yes');assert req('/admin/transfers','worker',approval)[0]>=400;assert req('/admin/transfers','owner',approval)[0]==303
 assert scalar("select vendor_payee from team_members where user_id='test-alice'")=='test-vendor' and scalar("select effective_from from team_members where user_id='test-alice'")==ymd(1)
 assert scalar("select rate_accepted from team_members where user_id='test-alice'")==0;assert req('/admin/transfers','owner',approval)[0]>=400
 restriction=form('/admin/transfers?project=speech-pair','Apply project access action','worker');restriction.update(projectId='speech-pair',userId='test-alice',state='blocked',reason='Synthetic project access review preserving work and financial evidence.')
 assert req('/admin/transfers','vendor',restriction)[0]>=400;assert req('/admin/transfers','worker',restriction)[0]==303
 assert 'access to this project is blocked' in req('/projects/work?id=speech-pair','alice')[1]
 restriction['state']='removed';assert req('/admin/transfers','worker',restriction)[0]==303
 assert scalar("select count(*) from team_members where user_id in ('test-alice','test-%s')"%partner)==0 and scalar("select count(*) from participants where id in ('test-alice','test-%s')"%partner)==2
 assert scalar("select count(*) from support_tickets where subject='Project removal review'")==2
 run("insert into project_progress(user_id,project_id,day,status,minutes,units,approved_minutes,notes,review,review_note,updated) values('test-alice','speech-pair','%s','completed',60,5,60,'Synthetic','client-approved','Synthetic QC','old-work')"%ymd(-1))
 post=form('/admin/payouts','Post earnings','owner');post.update(userId='test-alice',projectId='speech-pair',day=ymd(-1));assert req('/admin/payouts','owner',post)[0]==303
 assert scalar("select count(*) from earnings where user_id='test-vendor'")==0 and scalar("select sum(amount_paise) from earnings")==50000
 for u in ['alice',partner]:
  restriction.update(userId='test-'+u,state='active');assert req('/admin/transfers','worker',restriction)[0]==303
 assert scalar("select count(*) from team_members where user_id in ('test-alice','test-%s')"%partner)==2
 for path in ['/','/projects','/projects/detail?id=speech-pair','/workspace']:assert 'aria-label="Share ' not in req(path,'alice')[1]
 daily=form('/teams?team='+teams['tlone'],'Submit daily TL report','tlone');daily.update(teamId=teams['tlone'],summary='Synthetic member follow-up and daily evidence review completed.',blockers='No blockers.',nextSteps='Review the remaining daily updates.',contactedCount='999',unresponsiveCount='0');assert req('/teams','tlone',daily)[0]>=400
 daily['contactedCount']='0';assert req('/teams','tlone',daily)[0]==303
 start=time.monotonic()
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:statuses=list(pool.map(lambda _:req('/teams?team='+teams['tltwo'],'tltwo')[0],range(100)))
 assert all(st==200 for st in statuses),statuses
 elapsed=time.monotonic()-start
 f=form('/admin/policies','Publish new policy version','owner');f.update(body=scalar("select body from policy_versions where id=(select version_id from current_policy where id='platform')")+'\nProspective synthetic clarification.',confirmed='yes')
 duties=json.loads(scalar("select duties from policy_versions where id=(select version_id from current_policy where id='platform')"));f.update({'duty_'+k:v for k,v in duties.items()})
 assert req('/admin/policies','worker',f)[0]>=400;assert req('/admin/policies','owner',f)[0]==303
 assert req('/teams','tlone',daily)[0]>=400;agree('owner','owner');assert scalar("select count(*) from policy_acceptances where user_id='test-owner' and role='owner'")==2
 assert scalar('select count(*) from payout_orders')==0
 privacy=form('/admin/policies','Publish privacy notice','owner');privacy.update(privacy='Synthetic privacy publication. '+('Data is private to authorized reviewers. '*8)+'<script>alert(1)</script>',confirmed='yes');assert req('/admin/policies','manager',privacy)[0]>=400;assert req('/admin/policies','owner',privacy)[0]==303
 public_privacy=req('/privacy',None)[1];assert 'Synthetic privacy publication.' in public_privacy and '<script>alert(1)</script>' not in public_privacy and '&lt;script&gt;' in public_privacy
 print('PASS V10: real role agreement acceptance/reacceptance; balanced registration; expired/revoked/capped invites and atomic concurrent slots; cross-team denial; paired transfers; owner-only prospective payer changes; history-safe QC earnings after removal; block/restore; revoked helpers/sessions/folder verification; no public shares; daily counts; 100 scoped requests over eight workers in %.2fs. No real payments or external telemetry.'%elapsed)
finally:
 server.terminate();server.wait(timeout=10)
