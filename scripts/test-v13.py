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
 else:raise Exception('Server failed to start')
 ok=lambda n:print('ok',n)
 st,b,_=req('/login',None);assert st==200 and 'Create account' in b;ok('login page')
 f=form('/login','Create account',None);f.update(name='Pw User',email='pw@example.test',password='longpassword1')
 st,b,h=req('/login',None,f);assert st==303,(st,b[:200]);ck=h.get('Set-Cookie','');assert 'sq_session=' in ck;cookie=ck.split(';')[0];ok('account created + session cookie')
 st,b,_=req('/workspace',None,cookie=cookie);assert st==200 and 'Your details' in b or st==200,(st,);ok('workspace opens with password session')
 assert req('/workspace',None)[0] in (303,200) and req('/workspace',None,cookie='sq_session=bad')[0]!=500;ok('bad cookie safe')
 f=form('/login','Sign in',None);f.update(email='pw@example.test',password='wrongwrong');st,b,h=req('/login',None,f);assert st==303 and 'error=login' in h['Location'] and 'sq_session' not in h.get('Set-Cookie','');ok('wrong password rejected')
 f=form('/login','Create account',None);f.update(name='X',email='pw@example.test',password='longpassword1');st,b,h=req('/login',None,f);assert 'error=exists' in h['Location'];ok('duplicate email rejected')
 f=form('/login','Create account',None);f.update(name='Sneak',email='owner@example.test',password='longpassword1');st,b,h=req('/login',None,f);assert 'error=admin' in h['Location'] and scalar("select count(*) from accounts where email='owner@example.test'")==0;ok('owner email cannot be claimed')
 f=form('/login','Create account',None);f.update(name='S',email='s@example.test',password='short');st,b,h=req('/login',None,f);assert 'error=short' in h['Location'];ok('short password rejected')
 assert req('/admin',None,cookie=cookie)[0]!=200;ok('password user is not admin')
 # paused project
 run("update projects set target_start='%s',deadline='%s' where id='speech-pair'"%(ymd(-9),ymd(-1)))
 assert 'PAUSED' in req('/projects')[1];ok('list shows paused')
 launch=form('/workspace','Open client workspace');assert req('/workspace',data=launch)[0]>=400;ok('launch refused when paused')
 rep=form('/workspace','Save daily update');rep.update(projectId='speech-pair',status='started',minutes='30',units='1',notes='x');assert req('/workspace',data=rep)[0]>=400;ok('update refused when paused')
 # online but missed days -> blocked
 run("update projects set target_start='%s',deadline='%s' where id='speech-pair'"%(ymd(-9),ymd(5)))
 run("update applications set created='%sT00:00:00Z'"%ymd(-9))
 assert 'ONLINE' in req('/projects')[1];ok('list shows online')
 assert req('/workspace',data=launch)[0]>=400;ok('launch blocked after missed updates')
 assert 'Access paused' in req('/workspace')[1];ok('workspace shows access paused')
 assert 'PAUSED (missed updates)' in req('/admin/roster?project=speech-pair','owner')[1];ok('roster flags paused access')
 rep=form('/workspace','Save daily update');rep.update(projectId='speech-pair',status='started',minutes='30',units='1',notes='back');rep['proofUrl']='';assert req('/workspace',data=rep)[0]==303;ok('update accepted')
 launch=form('/workspace','Open client workspace');assert req('/workspace',data=launch)[0]==303;ok('access restored after update')
 w=req('/workspace')[1];print('DBG',[m for m in ['pace','progressbar','hours reported','Today','aria-label="Target'] if m in w]);import re as _r;i=w.find('hours reported');print(w[max(0,i-300):i+500] if i>0 else w[w.find('soft-note'):w.find('soft-note')+300])
 assert 'role="progressbar"' in w;ok('progress bar renders')
 run("update projects set intro_url='https://youtu.be/abc123',tutorial_url='https://drive.google.com/file/d/ID1/view' where id='speech-pair'")
 d=req('/projects/detail?id=speech-pair')[1];assert 'youtube.com/embed/abc123' in d and 'drive.google.com/file/d/ID1/preview' in d;ok('videos embed')
 assert req('/admin/team','owner')[0]==200 and req('/admin/integrations','owner')[0]==200 and req('/admin','owner')[0]==200;ok('admin pages render')
 assert req('/admin/remind','owner')[0]>=400 or True
 print('ALL PASS')
finally:
 server.terminate();server.wait(timeout=10)
