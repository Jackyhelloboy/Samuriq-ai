import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHostedRequest } from '../lib/hosting-request.mjs';

test('direct Cloudflare hosting strips forged identity and preserves session cookies', async () => {
  const request = new Request('https://samuriqai.in/account', { method: 'POST', body: 'action=save', headers: {
    'OAI-Authenticated-User-ID': 'forged-owner', 'oai-authenticated-user-email': 'owner@example.test',
    'oai-authenticated-user-future-field': 'untrusted', cookie: 'sq_session=synthetic', origin: 'https://samuriqai.in',
  } });
  const clean = sanitizeHostedRequest(request, 'cloudflare');
  assert.equal([...clean.headers.keys()].some(name => name.startsWith('oai-authenticated-user-')), false);
  assert.equal(clean.headers.get('cookie'), 'sq_session=synthetic');
  assert.equal(clean.headers.get('origin'), 'https://samuriqai.in');
  assert.equal(clean.method, 'POST');
  assert.equal(await clean.text(), 'action=save');
});
test('existing platform hosting keeps its trusted proxy integration', () => {
  const request = new Request('https://example.test/', { headers: { 'oai-authenticated-user-id': 'platform-user' } });
  assert.equal(sanitizeHostedRequest(request, undefined), request);
});
