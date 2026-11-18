"""Security and website-only workflows using disposable local D1/R2 and fake data."""
import base64
import datetime
import hashlib
import html
import json
import pathlib
import re
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
cli = ['node', str(root / 'node_modules/wrangler/bin/wrangler.js')]
config = str(root / 'dist/server/wrangler.json')
password = 'Synthetic-Audit-Only-2026!'
salt = '0123456789abcdef0123456789abcdef'
pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).date().isoformat()
now = datetime.datetime.now(datetime.timezone.utc).isoformat()

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

opener = urllib.request.build_opener(NoRedirect)

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

with tempfile.TemporaryDirectory(prefix='samuriq-security-') as state:
    sql = '\n'.join(p.read_text().replace('--> statement-breakpoint', '') for p in sorted((root / 'drizzle').glob('*.sql')))
    roles = {'owner': 'owner', 'manager': 'manager', 'leader': 'tl', 'alice': 'contributor', 'bob': 'contributor', 'outsider': 'contributor'}
    for name, role in roles.items():
        uid = 'audit-' + name
        sql += f"\nINSERT INTO accounts(id,email,name,salt,hash,created) VALUES ({quote(uid)},{quote(name+'@example.test')},{quote('Synthetic '+name)},{quote(salt)},{quote(pw_hash)},{quote(now)});"
        sql += f"\nINSERT INTO participants(id,name,email,telegram,language,project,phone,phone_consent,created) VALUES ({quote(uid)},{quote('Synthetic '+name)},{quote(name+'@example.test')},'','Hindi','general','+919000000000',1,{quote(now)});"
        for allowed in set([role, 'contributor']):
            sql += f"\nINSERT INTO policy_acceptances SELECT {quote(uid)},version_id,{quote(allowed)},{quote('Synthetic '+name)},{quote(now)},'synthetic-fixture' FROM current_policy WHERE id='platform';"
    sql += f"\nINSERT INTO managers VALUES ('audit-manager','audit-owner',{quote(now)});"
    sql += f"\nINSERT INTO projects(id,title,category,description,requirements,client_url,invite_code,pair,active,visibility,created) VALUES ('audit-individual','Security test individual project','Synthetic','Disposable test only','Synthetic fixture','https://example.test/work','',0,1,'listed',{quote(now)});"
    sql += f"\nINSERT INTO project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created) VALUES ('audit-team','audit-individual','audit-leader','Synthetic audit team','AUDIT-TEAM',100,100,'audit-owner',{quote(now)});"
    for name in ['alice', 'bob']:
        sql += f"\nINSERT INTO applications(user_id,project_id,partner,experience,status,community_verified,created) VALUES ('audit-{name}','audit-individual','','Synthetic fixture','approved',1,{quote(now)});"
        sql += f"\nINSERT INTO team_members(project_id,user_id,team_id,rate_accepted,rate_paise,base_rate_paise,joined) VALUES ('audit-individual','audit-{name}','audit-team',1,100,100,{quote(now)});"
    sql += "\nINSERT INTO auth_limits(key,attempts,expires) VALUES ('expired-security-fixture',1,1);"
    seed = pathlib.Path(state) / 'seed.sql'
    seed.write_text(sql)
    subprocess.run(cli + ['d1', 'execute', 'DB', '--config', config, '--local', '--persist-to', state, '--file', str(seed)], cwd=root, check=True, stdout=subprocess.DEVNULL)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    def request(path, fields=None, cookie='', origin=None):
        headers = {'Cookie': cookie} if cookie else {}
        data = None
        if fields is not None:
            boundary = 'SAMURIQ_SECURITY_AUDIT'
            parts = []
            for key, value in fields.items():
                disposition = f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"'
                if isinstance(value, tuple):
                    disposition += f'; filename="{value[0]}"\r\nContent-Type: image/png'
                    payload = value[1]
                else:
                    payload = str(value).encode()
                parts.extend([disposition.encode() + b'\r\n\r\n', payload, b'\r\n'])
            data = b''.join(parts) + f'--{boundary}--\r\n'.encode()
            headers.update({'Content-Type': f'multipart/form-data; boundary={boundary}', 'Origin': origin or base})
        try:
            response = opener.open(urllib.request.Request((path if path.startswith(base + "/") else base + path), data=data, headers=headers), timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        return response.status, response.read(), response.headers
    def form(path, label, cookie=''):
        status, raw, _ = request(path, cookie=cookie)
        assert status == 200, (path, status)
        forms = re.findall(r'<form\b.*?</form>', raw.decode(), re.S)
        selected = next((f for f in forms if label in f), None)
        assert selected, (path, label)
        fields = {}
        for tag in re.findall(r'<input[^>]*>', selected):
            name = re.search(r'name="([^"]+)"', tag)
            value = re.search(r'value="([^"]*)"', tag)
            if name:
                fields[html.unescape(name[1])] = html.unescape(value[1]) if value else ''
        return fields
    def login(name, pw=password):
        fields = form('/login', '>Sign in</button>')
        fields.update(email=name+'@example.test', password=pw, return_to='/workspace')
        status, _, headers = request('/login', fields)
        assert status in [303, 307], (name, status)
        cookies = headers.get_all('Set-Cookie', [])
        return next((c.split(';')[0] for c in cookies if c.startswith('sq_session=')), ''), headers
    def database():
        for path in pathlib.Path(state).rglob('*.sqlite'):
            connection = sqlite3.connect(path)
            if connection.execute("SELECT count(*) FROM sqlite_master WHERE name='accounts'").fetchone()[0]:
                return connection
            connection.close()
        raise AssertionError('Test database missing')
    with (pathlib.Path(state) / 'server.log').open('w+') as log:
        server = subprocess.Popen(cli + ['dev', '--config', config, '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', str(port), '--inspector-port', '0', '--var', 'ADMIN_EMAIL:owner@example.test', '--var', 'BANK_ENCRYPTION_KEY:' + '01' * 32], cwd=root, stdout=log, stderr=log)
        try:
            for _ in range(100):
                try:
                    if request('/login')[0] == 200: break
                except (OSError, urllib.error.URLError): pass
                time.sleep(.25)
            else: raise AssertionError('Worker did not start')
            status, body, headers = request('/login')
            assert headers.get('X-Content-Type-Options') == 'nosniff'
            assert headers.get('X-Frame-Options') == 'SAMEORIGIN'
            assert "frame-ancestors 'self'" in headers.get('Content-Security-Policy', '')
            assert 'no-store' in headers.get('Cache-Control', '')
            for path in ['/api/telegram', '/api/telegram/status', '/api/telegram/me']:
                assert request(path)[0] == 404, path
            assert request('/api/client-status')[0] == 401
            assert request('/workspace/telegram')[2].get('Location') == base + '/support'
            assert b'samuriqai.in/sitemap.xml' in request('/robots.txt')[1]
            sessions = {name: login(name)[0] for name in roles}
            assert all(sessions.values())
            editor = '/admin/projects/post?id=audit-individual'
            for actor in ['manager', 'owner']:
                fields = form(editor, 'Save post', sessions[actor])
                title = 'Project updated by ' + actor
                fields.update(title=title, category='Speech & audio', location='Remote',
                              description='Revised public description', requirements='Headphones')
                blocked = request(editor, dict(fields, title='Unauthorized change'), sessions['alice'])
                assert blocked[0] >= 300
                assert request(editor, fields, sessions[actor])[0] in [303, 307]
                for path in ['/', '/projects', '/projects/detail?id=audit-individual']:
                    status, page, _ = request(path)
                    assert status == 200 and title.encode() in page, (path, status)
                stale = request(editor, dict(fields, title='Outdated change'), sessions[actor])
                assert 'conflict' in stale[2].get('Location', ''), stale[0]
                with database() as db:
                    assert db.execute("SELECT title FROM projects WHERE id='audit-individual'").fetchone()[0] == title
            assert b'Join project group' not in request('/workspace', cookie=sessions['alice'])[1]
            assert b'Connect my Drive folder' not in request('/workspace/evidence', cookie=sessions['alice'])[1]
            for name in ['alice', 'bob', 'leader', 'manager', 'outsider']:
                for path in ['/admin/payments/reveal', '/admin/identity/document']:
                    assert request(path, {'userId': 'audit-alice'}, sessions[name])[0] == 403, (name, path)
                for path in ['/admin/export', '/admin/registrations', '/admin/team/export']:
                    assert request(path, cookie=sessions[name])[0] == 403, (name, path)
            profile = form('/workspace?edit=1', 'Save my profile', sessions['outsider'])
            profile.update(name='Synthetic Outsider', username='audit_outsider', language='Hindi', project='general', primaryProject='', phone='+19999999999', phoneConsent='yes', consent='yes', next='')
            assert request('/workspace?edit=1', profile, sessions['outsider'])[0] in [303, 307]
            with database() as db:
                assert db.execute("SELECT telegram FROM participants WHERE id='audit-outsider'").fetchone()[0] == ''
            account_help = form('/support', 'Create ticket', sessions['outsider'])
            account_help.update(teamId='', subject='Synthetic account support', body='Synthetic-only private account setup question')
            help_status, _, help_headers = request('/support', account_help, sessions['outsider'])
            assert help_status in [303, 307], ('account support', help_status)
            help_page = request(help_headers['Location'], cookie=sessions['outsider'])
            assert b'Synthetic-only private account setup question' in help_page[1], (help_page[0], help_headers['Location'], re.sub('<[^>]+>', ' ', help_page[1].decode(errors='replace'))[-1200:])
            assert b'Synthetic-only private account setup question' not in request(help_headers['Location'], cookie=sessions['bob'])[1]
            bank = form('/workspace/payments', 'Save bank details securely', sessions['alice'])
            bank.update(holder='Synthetic Alice', ifsc='ABCD0123456', account='881122334499', confirm='881122334499', consent='yes')
            assert request('/workspace/payments', bank, sessions['alice'])[0] in [303, 307]
            status, alice_page, _ = request('/workspace/payments', cookie=sessions['alice'])
            assert status == 200 and b'4499' in alice_page and b'881122334499' not in alice_page
            assert b'4499' not in request('/workspace/payments', cookie=sessions['bob'])[1]
            with database() as db:
                encrypted = db.execute("SELECT encrypted FROM bank_details WHERE user_id='audit-alice'").fetchone()[0]
                assert '881122334499' not in encrypted and 'Synthetic Alice' not in encrypted
            assert request('/admin/payments/reveal', {'userId': 'audit-alice'}, sessions['owner'])[0] == 200
            assert request('/admin/payments/reveal', {'userId': 'audit-alice'}, sessions['owner'], origin='https://attacker.example')[0] == 403
            screenshot = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1cAAAAASUVORK5CYII=')
            fields = {'day': today, 'sectionId': 'audit-section-1', 'screenshot': ('synthetic.png', screenshot), 'consent': 'yes'}
            result = request('/evidence/upload?project=audit-individual', fields, sessions['alice'])
            assert result[0] == 303, ('individual upload', result[0], result[1][:300])
            with database() as db:
                item = db.execute("SELECT id FROM evidence_items WHERE user_id='audit-alice'").fetchone()[0]
            for name, expected in [('alice', 200), ('leader', 200), ('manager', 200), ('owner', 200), ('bob', 403), ('outsider', 403)]:
                status, raw, hdr = request('/evidence/file?id=' + item, cookie=sessions[name])
                assert status == expected, ('evidence authorization', name, status)
                if expected == 200:
                    assert raw == screenshot and 'no-store' in hdr.get('Cache-Control', '')
            assert request('/evidence/upload?project=audit-individual', fields, sessions['alice'])[0] == 409
            assert request('/evidence/upload?project=audit-individual', fields, sessions['outsider'])[0] == 403
            assert b'Send using Cashfree' not in request('/admin/payouts', cookie=sessions['owner'])[1]
            second_owner, _ = login('owner')
            change = form('/admin/security', 'Save my password', sessions['owner'])
            change.update(currentPassword=password, password='Synthetic-New-Audit-Password-2026!', confirm='Synthetic-New-Audit-Password-2026!')
            status, _, hdr = request('/admin/security', change, sessions['owner'])
            assert status in [303, 307], ('owner password', status)
            for old in [sessions['owner'], second_owner]:
                assert '/login' in request('/admin/payments', cookie=old)[2].get('Location', '')
            new_owner = next(c.split(';')[0] for c in hdr.get_all('Set-Cookie', []) if c.startswith('sq_session='))
            assert request('/admin/payments', cookie=new_owner)[0] == 200
            for _ in range(13):
                attempt = form('/login', '>Sign in</button>')
                attempt.update(email='rate-audit@example.test', password='Incorrect-synthetic-value')
                _, _, rate = request('/login', attempt)
            assert 'error=rate' in rate.get('Location', '')
            with database() as db:
                assert db.execute("SELECT count(*) FROM auth_limits WHERE key='expired-security-fixture'").fetchone()[0] == 0
            assert urllib.parse.urlsplit(request('/signout?return_to=%2F%5Cevil.example')[2]['Location']).hostname == '127.0.0.1'
            print('PASS SECURITY: password sessions; owner/manager/leader/contributor separation; encrypted bank storage; private upload/download; cross-account denial; duplicate rejection; disabled external integrations; security headers; safe sign-out; owner session revocation; rate limiting.')
        except Exception:
            log.flush(); log.seek(0); print(log.read()[-5000:]); raise
        finally:
            server.terminate(); server.wait(timeout=15)
