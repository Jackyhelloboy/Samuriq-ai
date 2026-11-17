// Direct hosting does not have the trusted platform proxy that injects identity.
// Password sessions remain available; visitors cannot supply platform identities.
export function sanitizeHostedRequest(request, hostingMode) {
  if (hostingMode !== 'cloudflare') return request;
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  }
  return new Request(request, { headers });
}
