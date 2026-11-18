export function secureHostedResponse(response, request, mode) {
  if (mode !== 'cloudflare') return response;
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'same-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Permissions-Policy', 'geolocation=(), payment=(), usb=()');
  if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (!headers.has('Content-Security-Policy')) {
    headers.set('Content-Security-Policy', "base-uri 'self'; object-src 'none'; frame-ancestors 'self'");
  }
  const type = headers.get('Content-Type') || '';
  if (request.headers.has('Cookie') || /^(text\/html|application\/json)/i.test(type)) {
    headers.set('Cache-Control', 'private, no-store');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
