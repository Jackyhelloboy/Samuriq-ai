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
sql+="""
INSERT INTO identity_records(user_id,pan_hash,document_hash,encrypted,pan_last4,status,document_key,document_type,updated) VALUES ('test-worker','test-pan-hash','test-document-hash','fixture','000A','manual-reviewed','fixture','image/png','2026-01-01');
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
def req(path,user='worker',data=None,origin=base):
 headers={'oai-authenticated-user-id':'test-'+user,'oai-authenticated-user-email':user+'@example.test'} if user else {}
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
try:
 for i in range(60):
  try:
   if req('/')[0]==200:break
  except Exception:pass
  time.sleep(.5)
 else:raise Exception('Server failed to start')
 assert req('/admin/export',None)[0]==403
 pair=form('/workspace','Confirm my permanent pair','partner');pair['consent']='yes';assert req('/workspace','partner',pair)[0]==303
 assert scalar("select count(*) from pair_claims")==2
 assert scalar("select count(*) from applications where partner_confirmed=1 and partner_email='partner@example.test'")==1
 duplicate={**pair,'leadId':'test-other','consent':'yes'};assert req('/workspace','partner',duplicate)[0]>=400
 assert scalar("select count(*) from pair_claims")==2
 assert 'Save partner invitation' not in req('/workspace','lead')[1]
 
 html=req('/workspace')[1];assert 'webrtcsg.shenfei-rec.com' not in html
 launch=form('/projects/work?id=speech-pair','Load client workspace');launch.update(mode='embed');code,body,headers=req('/projects/launch',data=launch);assert code==303 and 'webrtcsg.shenfei-rec.com' in headers['Location'];assert scalar('select count(*) from launches')==1
 assert req('/projects/launch','intruder',launch)[0]>=400
 report=form('/workspace','Save daily update');report.update(projectId='speech-pair',status='completed',minutes='30',units='5',notes='Test proof',clientId='test-client')
 assert req('/workspace',data=report)[0]>=400
 report['proofUrl']='https://drive.google.com/file/d/test-proof/view';assert req('/workspace',data=report)[0]==303
 review=form('/admin/reports','Save review','owner');review.update(review='client-approved',reviewNote='Test client QC reference',approvedMinutes='30');assert req('/admin/reports','owner',review)[0]==303
 assert scalar('select review from project_progress')=='client-approved'
 assert scalar('select approved_minutes from project_progress')==30
 code,clientcsv,_=req('/admin/team/export','owner');assert code==200 and 'Permanent partner' in clientcsv and 'Sections today' in clientcsv and 'test-proof' not in clientcsv and '12345678901' not in clientcsv
 assert req('/admin/team/export',None)[0]==403
 excessive={**review,'approvedMinutes':'31'};assert req('/admin/reports','owner',excessive)[0]>=400
 assert scalar('select approved_minutes from project_progress')==30
 assert req('/workspace',data=report)[0]==303
 assert scalar('select review from project_progress')=='pending'
 assert scalar('select approved_minutes from project_progress')==0
 assert req('/admin/reports','owner',review)[0]>=400
 day=scalar('select day from project_progress');code,csv,_=req('/admin/export?day='+day,'owner');assert code==200 and 'Missing Worker' in csv and 'No report' in csv and 'test-client' in csv and 'test-proof' in csv
 bank=form('/workspace/payments','Save bank details');bank.update(holder='Test Worker',account='12345678901',confirm='12345678901',ifsc='TEST0123456',consent='yes');assert req('/workspace/payments',data=bank)[0]==303
 encrypted=scalar('select encrypted from bank_details');assert '12345678901' not in encrypted and 'Test Worker' not in encrypted
 assert '12345678901' not in req('/workspace/payments')[1]
 assert '12345678901' not in req('/admin/payments','owner')[1]
 assert req('/admin/payments/reveal','worker',{'userId':'test-worker'})[0]==403
 assert req('/admin/payments/reveal','owner',{'userId':'test-worker'},origin='https://evil.example')[0]==403
 code,body,headers=req('/admin/payments/reveal','owner',{'userId':'test-worker'});assert code==200 and '12345678901' in body and 'no-store' in headers['Cache-Control']
 assert req('/admin/payments/reveal','owner')[0] in (404,405)
 assert scalar("select count(*) from bank_audit where action='revealed'")==1

 assert req('/login','owner')[2].get('Location')=='/admin/dashboard'
 assert req('/login','worker')[2].get('Location')=='/workspace'
 assert 'Admin sign in' not in req('/')[1]
 controls=form('/admin/settings','Save platform controls','owner')
 for key in ['applications','reporting','bank','client_access','community','announcements']:controls[key]='on'
 assert req('/admin/settings','worker',controls)[0]>=400
 controls.pop('reporting');controls.pop('client_access');controls.pop('bank')
 assert req('/admin/settings','owner',controls)[0]==303
 assert req('/workspace',data=report)[0]>=400
 assert req('/projects/launch',data=launch)[0]>=400
 assert req('/workspace/payments',data=bank)[0]>=400
 for key in ['reporting','client_access','bank']:controls[key]='on'
 assert req('/admin/settings','owner',controls)[0]==303
 imp=form('/admin/import','Import as drafts','owner')
 csv='title,category,description,requirements,rate,location,client_url,invite_code,pair\r\n'
 csv+=''.join('Import '+str(i)+',Data annotation,Local test only,Test requirements,Test rate,Remote,,,no\r\n' for i in range(51))
 imp['csv']=('test.csv',csv)
 assert req('/admin/import','worker',imp)[0]>=400
 assert req('/admin/import','owner',imp)[0]==303
 assert scalar("select count(*) from projects where title like 'Import %' and active=0")==51
 c=db();c.execute("update projects set active=1 where title like 'Import %'");c.commit();c.close()
 assert req('/projects')[1].count('id="project-')==50
 assert req('/projects?page=2')[1].count('id="project-')==2
 assert req('/admin/settings','owner')[0]==200
 print('PASS: owner routing, feature pause enforcement, 51-row draft CSV import and 50-project pagination; permanent partner consent and duplicate-pair rejection; client-safe sections CSV; QC minute cap and reset; approval-gated launch logging; proof required; review reset and stale-review protection; daily CSV including missing reports; encrypted bank storage; masking; owner-only reveal; origin checks; reveal audit; no GET reveal.')
finally:
 server.terminate();server.wait(timeout=10)
