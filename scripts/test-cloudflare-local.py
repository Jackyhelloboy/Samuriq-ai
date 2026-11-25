"""Exercise the Cloudflare build using disposable D1 data and real password forms."""
import hashlib
import concurrent.futures
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
config = root / 'dist/server/wrangler.json'
cli = ['node', str(root / 'node_modules/wrangler/bin/wrangler.js')]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

opener = urllib.request.build_opener(NoRedirect)
with tempfile.TemporaryDirectory(prefix='samuriq-cloudflare-test-') as state:
    seed = pathlib.Path(state) / 'seed.sql'
    seed.write_text('\n'.join(p.read_text().replace('--> statement-breakpoint', '') for p in sorted((root / 'drizzle').glob('*.sql'))))
    email = 'cloudflare-smoke@example.com'
    subprocess.run(cli + ['d1', 'execute', 'DB', '--config', str(config), '--local', '--persist-to', state, '--file', str(seed)], cwd=root, check=True, stdout=subprocess.DEVNULL)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    with (pathlib.Path(state) / 'server.log').open('w+') as log:
        server = subprocess.Popen(cli + ['dev', '--config', str(config), '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', str(port), '--inspector-port', '0', '--var', 'ADMIN_EMAIL:owner@example.com'], cwd=root, stdout=log, stderr=log)
        def request(path, fields=None, headers=None):
            headers = dict(headers or {})
            body = None
            if fields is not None:
                boundary = 'SAMURIQ_CLOUDFLARE_TEST'
                body = (''.join(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n' for key, value in fields.items()) + f'--{boundary}--\r\n').encode()
                headers.update({'Content-Type': f'multipart/form-data; boundary={boundary}', 'Origin': base})
            try:
                response = opener.open(urllib.request.Request(base + path, data=body, headers=headers), timeout=30)
            except urllib.error.HTTPError as error:
                response = error
            return response.status, response.read().decode(), response.headers

        def form(label, path='/login', headers=None):
            status, body, _ = request(path, headers=headers)
            assert status == 200, status
            selected = next(value for value in re.findall(r'<form\b.*?</form>', body, re.S) if label in value)
            fields = {}
            for tag in re.findall(r'<input[^>]*>', selected):
                name = re.search(r'name="([^"]+)"', tag)
                value = re.search(r'value="([^"]*)"', tag)
                if name:
                    fields[html.unescape(name[1])] = html.unescape(value[1]) if value else ''
            return fields

        try:
            for _ in range(80):
                try:
                    if request('/')[0] == 200:
                        break
                except (OSError, urllib.error.URLError):
                    pass
                time.sleep(.25)
            else:
                raise AssertionError('Cloudflare Worker did not serve the home page')
            status, body, _ = request('/')
            assert status == 200 and 'Start here. Keep it simple.' not in body and 'Project opportunities' in body and 'Skip to main content' in body
            for path in ['/projects', '/login', '/privacy', '/favicon.svg']:
                assert request(path)[0] == 200, path
            status, project_board, _ = request('/projects')
            assert status == 200 and 'Public navigation' in project_board
            assert 'workspace-switcher' not in project_board and 'Payment details' not in project_board
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as workers:
                statuses = list(workers.map(lambda _: request('/projects')[0], range(100)))
            assert all(status == 200 for status in statuses), statuses
            for old, current in [('/demo/login', '/login'), ('/demo', '/projects')]:
                status, _, headers = request(old)
                assert status == 308 and headers.get('Location') == current, (old, status, headers)
            # Check header-based size admission before body consumption: evidence
            # must reach authorization, while ordinary forms reject the same size.
            for path, expected in [('/evidence/upload', 403), ('/login', 413)]:
                try:
                    response = opener.open(urllib.request.Request(base + path, data=b'', headers={'Origin': base, 'Content-Type': 'application/octet-stream', 'Content-Length': str(5 * 1024 * 1024)}), timeout=30)
                except urllib.error.HTTPError as error:
                    response = error
                assert response.status == expected, (path, response.status)
            forged = {'oai-authenticated-user-id': 'test-owner', 'oai-authenticated-user-email': 'owner@example.com'}
            status, response_body, headers = request('/admin/dashboard', headers=forged)
            assert status in (302, 303, 307, 308) and '/login?return_to=%2Fadmin%2Fdashboard' in headers.get('Location', ''), (status, headers, re.sub('<[^>]+>', ' ', response_body)[-3000:])
            try:
                response = opener.open(urllib.request.Request(base + '/login', data=b'test', headers={'Origin': 'https://attacker.example'}))
            except urllib.error.HTTPError as error:
                response = error
            assert response.status == 403, response.status
            signup = form('Create account')
            signup.update(age='25', state='27', phone='+919000000000', device='iOS', osVersion='18.4', name='Synthetic Cloudflare User', email=email, password='SyntheticOnly-Password-2026', confirmPassword='SyntheticOnly-Password-2026', return_to='/workspace')
            assert "code" not in signup
            mismatch = dict(signup, confirmPassword='Other-Password-2026')
            status, _, headers = request('/login', mismatch)
            assert status in (303, 307) and 'passwordMismatch' in headers.get('Location', ''), (status, headers.get('Location'))
            status, _, headers = request('/login', signup)
            assert status in (303, 307) and any('sq_session=' in value for value in headers.get_all('Set-Cookie', [])), (status, dict(headers))
            status, _, headers = request('/login', signup)
            assert 'error=exists' in headers.get('Location', '')
            reserved = dict(signup, email='owner@example.com')
            status, _, headers = request('/login', reserved)
            assert 'error=admin' in headers.get('Location', '')
            signin = form('Sign in')
            signin.update(email=email, password='SyntheticOnly-Password-2026', return_to='/workspace')
            status, _, headers = request('/login', signin)
            cookies = headers.get_all('Set-Cookie', [])
            assert status in (303, 307) and any('sq_session=' in value for value in cookies), (status, dict(headers))
            session = next(value.split(';')[0] for value in cookies if value.startswith('sq_session='))
            status, profile_page, _ = request('/workspace', headers={'Cookie': session, **forged})
            assert status == 200 and 'Maharashtra' in profile_page and '+919000000000' in profile_page and '18.4' in profile_page, status
            status, _, _ = request('/admin/settings', headers={'Cookie': session, **forged})
            assert status in (302, 303, 307, 308, 403), status
            # Seed a delivery proof without contacting a real mailbox.
            for state_db in pathlib.Path(state).rglob('*.sqlite'):
                with sqlite3.connect(state_db) as db:
                    if db.execute("SELECT 1 FROM sqlite_master WHERE name='accounts'").fetchone():
                        break
            else:
                raise AssertionError('Local D1 account database not found')
            token = 'ab' * 32
            with sqlite3.connect(state_db) as db:
                account_id = db.execute('SELECT id FROM accounts WHERE email=?', (email,)).fetchone()[0]
                assert db.execute('SELECT 1 FROM verified_mailboxes WHERE email=?', (email,)).fetchone() is None
                now = int(time.time() * 1000)
                proof = hashlib.sha256(json.dumps(['mailbox-link', account_id, token], separators=(',', ':')).encode()).hexdigest()
                db.execute('INSERT INTO email_challenges VALUES (?,?,?,?)', (email, proof, now + 60000, now))
            path = '/verify-email?token=' + token
            status, _, headers = request(path)
            assert status in (302, 303, 307, 308) and headers.get('Referrer-Policy') == 'no-referrer'
            confirm = form('Confirm email', path, {'Cookie': session})
            wrong = dict(confirm, token='cd' * 32)
            status, _, headers = request('/verify-email', wrong, {'Cookie': session})
            assert 'status=invalid' in headers.get('Location', ''), (status, dict(headers))
            status, _, headers = request('/verify-email', confirm, {'Cookie': session})
            assert status in (303, 307) and urllib.parse.urljoin(base, headers.get('Location', '')) == base + '/verify-email', (status, dict(headers))
            with sqlite3.connect(state_db) as db:
                assert db.execute('SELECT 1 FROM verified_mailboxes WHERE email=?', (email,)).fetchone()
                assert db.execute('SELECT 1 FROM email_challenges WHERE email=?', (email,)).fetchone() is None
                db.execute("UPDATE projects SET active=1,target_start='',deadline='',archived_at='' WHERE id='speech-pair'")
                db.execute("INSERT INTO projects(id,title,category,description,requirements,client_url,invite_code,active,created) VALUES ('permission-target','Second project','Speech & audio','Test project','Test requirements','','',1,'2026-11-24')")
                db.execute("INSERT INTO participants(id,name,email,telegram,language,project,created) VALUES (?,?,?,'','Hindi','general','2026-11-24')", (account_id, 'Synthetic Cloudflare User', email))
                db.execute("INSERT INTO applications(user_id,project_id,partner,experience,status,created) VALUES (?,'speech-pair','','Test application','pending','2026-11-24')", (account_id,))
            status, detail, _ = request('/projects/detail?id=permission-target', headers={'Cookie': session})
            assert status == 200 and 'A manager must approve your additional project' in detail, (status, detail[-1000:])
            permission = form('Request project permission', '/projects/detail?id=permission-target', {'Cookie': session})
            permission.update(projectId='permission-target', reason='I can manage both project schedules and deliverables.')
            status, _, _ = request('/projects/detail?id=permission-target', permission, {'Cookie': session})
            assert status in (303, 307), status
            with sqlite3.connect(state_db) as db:
                request_row = db.execute("SELECT status FROM project_permissions WHERE team_id='application:speech-pair' AND user_id=? AND project_id='permission-target'", (account_id,)).fetchone()
                assert request_row == ('pending',), request_row
                manager_token = 'cd' * 32
                db.execute("INSERT INTO accounts(id,email,name,salt,hash,created) VALUES ('test-manager','manager@example.com','Manager','','','2026-11-24')")
                db.execute("INSERT INTO managers(user_id,granted_by,created) VALUES ('test-manager','owner','2026-11-24')")
                db.execute("INSERT INTO sessions(token_hash,account_id,expires) VALUES (?,'test-manager',?)", (hashlib.sha256(manager_token.encode()).hexdigest(), int(time.time() * 1000) + 60000))
                db.execute("INSERT INTO policy_acceptances(user_id,version_id,role,accepted_name,accepted_at,content_hash) SELECT 'test-manager',version_id,'manager','Manager','2026-11-24','test' FROM current_policy WHERE id='platform'")
            manager_cookie = 'sq_session=' + manager_token
            status, queue, _ = request('/admin/projects/permissions', headers={'Cookie': manager_cookie})
            assert status == 200 and 'Second project' in queue and 'Synthetic Cloudflare User' in queue, (status, re.sub('<[^>]+>', ' ', queue)[-1400:])
            review = form('Approve access', '/admin/projects/permissions', {'Cookie': manager_cookie})
            review.update(userId=account_id, teamId='application:speech-pair', projectId='permission-target', decision='approved')
            status, _, _ = request('/admin/projects/permissions', review, {'Cookie': session})
            assert status >= 400, 'A contributor must not approve their own project switch'
            status, _, _ = request('/admin/projects/permissions', review, {'Cookie': manager_cookie})
            assert status in (303, 307), status
            with sqlite3.connect(state_db) as db:
                assert db.execute("SELECT status FROM project_permissions WHERE team_id='application:speech-pair' AND user_id=? AND project_id='permission-target'", (account_id,)).fetchone() == ('approved',)
            status, detail, _ = request('/projects/detail?id=permission-target', headers={'Cookie': session})
            assert status == 200 and 'A manager must approve your additional project' not in detail
            print('PASS CLOUDFLARE: D1 migrations, home/navigation/assets, real password signup/login, account email confirmation, forged-owner denial and cross-origin write denial.')
        except Exception:
            time.sleep(.5)
            log.flush()
            log.seek(0)
            print(log.read()[-6000:])
            raise
        finally:
            server.terminate()
            server.wait(timeout=15)
