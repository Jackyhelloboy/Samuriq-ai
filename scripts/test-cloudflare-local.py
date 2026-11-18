"""Exercise the Cloudflare build using disposable D1 data and real password forms."""
import hashlib
import html
import pathlib
import re
import socket
import subprocess
import tempfile
import time
import urllib.error
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
    code = '123456ABCDEF'
    digest = hashlib.sha256((email+'|'+code).encode()).hexdigest()
    with seed.open('a') as sql:
        sql.write(f"\nINSERT INTO email_challenges VALUES ('{email}','{digest}',{int(time.time()*1000)+1800000},{int(time.time()*1000)});")
    subprocess.run(cli + ['d1', 'execute', 'DB', '--config', str(config), '--local', '--persist-to', state, '--file', str(seed)], cwd=root, check=True, stdout=subprocess.DEVNULL)
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    with (pathlib.Path(state) / 'server.log').open('w+') as log:
        server = subprocess.Popen(cli + ['dev', '--config', str(config), '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', str(port), '--inspector-port', '0', '--var', 'ADMIN_EMAIL:owner@example.test'], cwd=root, stdout=log, stderr=log)
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

        def form(label):
            status, body, _ = request('/login')
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
            for path in ['/projects', '/login', '/demo/login', '/demo', '/privacy', '/favicon.svg']:
                assert request(path)[0] == 200, path
            # Check header-based size admission before body consumption: evidence
            # must reach authorization, while ordinary forms reject the same size.
            for path, expected in [('/evidence/upload', 403), ('/login', 413)]:
                try:
                    response = opener.open(urllib.request.Request(base + path, data=b'', headers={'Origin': base, 'Content-Type': 'application/octet-stream', 'Content-Length': str(5 * 1024 * 1024)}), timeout=30)
                except urllib.error.HTTPError as error:
                    response = error
                assert response.status == expected, (path, response.status)
            forged = {'oai-authenticated-user-id': 'test-owner', 'oai-authenticated-user-email': 'owner@example.test'}
            status, response_body, headers = request('/admin/dashboard', headers=forged)
            assert status in (302, 303, 307, 308) and '/login?return_to=%2Fadmin%2Fdashboard' in headers.get('Location', ''), (status, headers, re.sub('<[^>]+>', ' ', response_body)[-3000:])
            try:
                response = opener.open(urllib.request.Request(base + '/login', data=b'test', headers={'Origin': 'https://attacker.example'}))
            except urllib.error.HTTPError as error:
                response = error
            assert response.status == 403, response.status
            signup = form('Create account')
            signup.update(age='25', address='Synthetic address', city='Pune', phone='+919000000000', device='iPhone', osVersion='18.4', name='Synthetic Cloudflare User', email=email, password='SyntheticOnly-Password-2026', return_to='/workspace')
            status, _, headers = request('/login', signup)
            assert 'error=verification' in headers.get('Location','') and not any('sq_session=' in v for v in headers.get_all('Set-Cookie',[]))
            signup['code']=code
            status, _, headers = request('/login', signup)
            assert status in (303, 307) and any('sq_session=' in value for value in headers.get_all('Set-Cookie', [])), (status, headers)
            signin = form('Sign in')
            signin.update(email=email, password='SyntheticOnly-Password-2026', return_to='/workspace')
            status, _, headers = request('/login', signin)
            cookies = headers.get_all('Set-Cookie', [])
            assert status in (303, 307) and any('sq_session=' in value for value in cookies), (status, headers)
            session = next(value.split(';')[0] for value in cookies if value.startswith('sq_session='))
            status, profile_page, _ = request('/workspace', headers={'Cookie': session, **forged})
            assert status == 200 and 'Synthetic address' in profile_page and '+919000000000' in profile_page and '18.4' in profile_page, status
            status, _, _ = request('/admin/settings', headers={'Cookie': session, **forged})
            assert status in (302, 303, 307, 308, 403), status
            print('PASS CLOUDFLARE: D1 migrations, home/navigation/assets, real password signup/login, forged-owner denial and cross-origin write denial.')
        except Exception:
            time.sleep(.5)
            log.flush()
            log.seek(0)
            print(log.read()[-6000:])
            raise
        finally:
            server.terminate()
            server.wait(timeout=15)
