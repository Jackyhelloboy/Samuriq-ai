import test from 'node:test';
import assert from 'node:assert/strict';
import { secureHostedResponse } from '../lib/security-response.mjs';

test('private responses preserve cookies, body and stronger evidence policies', async () => {
  const headers = new Headers({ 'Content-Type': 'image/png', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Referrer-Policy': 'no-referrer' });
  headers.append('Set-Cookie', 'sq_session=synthetic; HttpOnly; Secure; SameSite=Lax');
  headers.append('Set-Cookie', 'sq_workspace=; Max-Age=0');
  const result = secureHostedResponse(new Response('synthetic-image', { headers }), new Request('https://example.test/evidence/file?id=fake', { headers: { Cookie: 'sq_session=synthetic' } }), 'cloudflare');
  assert.equal(await result.text(), 'synthetic-image');
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.equal(result.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");
  assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
});

test('anonymous HTML gets framing and MIME protections without breaking redirects', () => {
  const result = secureHostedResponse(new Response(null, { status: 303, headers: { Location: '/login', 'Content-Type': 'text/html' } }), new Request('https://example.test/admin'), 'cloudflare');
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('Location'), '/login');
  assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(result.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  assert.match(result.headers.get('Content-Security-Policy'), /frame-ancestors 'self'/);
  assert.equal(result.headers.get('Strict-Transport-Security'), 'max-age=31536000');
});

test('existing platform responses keep their hosting policy', () => {
  const response = new Response('platform');
  assert.equal(secureHostedResponse(response, new Request('https://example.test'), 'platform'), response);
});
