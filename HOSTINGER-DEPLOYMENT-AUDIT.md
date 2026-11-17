# Hostinger deployment investigation — 2026-11-17

Status: unresolved runtime incompatibility. The React packaging fix is necessary for the reported missing-module error but does not make this Cloudflare application runnable on plain Node.

## Evidence

- Inspected the exact deployed commit `293cb18e54e30ff0814ccc927f37df3343a6014a`.
- React and React DOM are already production dependencies (19.2.6). No dependency version or lockfile change is needed for the reported missing-React problem.
- Clean `npm ci` installed 697 packages.
- A Vinext build completed. A standalone test artifact was generated with `output: "standalone"` enabled locally for the test; that configuration change is not included in this PR.
- The generated server externals manifest was `[]`, although Vinext's runtime needs React.
- Postbuild packaging copied react, react-dom and scheduler and verified they resolve inside the artifact.
- Copied the standalone artifact outside the checkout so missing modules cannot fall back to the development node_modules directory.
- The isolated server bound a port, but GET / returned HTTP 500 with `ERR_UNSUPPORTED_ESM_URL_SCHEME: Received protocol 'cloudflare:'`.
- Reproduced that failure on Node 22.23.5 and Node 24.22.1.
- Verified the packager safely skips output with no standalone server, preserving Cloudflare-only builds.
- No authenticated Hostinger tools were available; `codex mcp get hostinger` reported no configured server. Current Hostinger files, settings, logs, DNS and deployment status have not been independently inspected in this investigation.

## Changes in this PR

- Replace the long shell postbuild command with `node scripts/package-standalone.mjs`.
- Package the installed React runtime packages using Node filesystem APIs.
- Avoid creating a misleading standalone directory when no Node server was generated.
- Add `npm run verify:standalone`: copy the artifact to a temporary directory, start it, request the home page, require HTTP 200 and real Samuriq content, and clean up the process/files.

The packaging check passes. The isolated application test deliberately remains failing and exposes the runtime blocker. This is not a completed production fix.

## Remaining compatibility work

- `db/index.ts` uses `cloudflare:workers` and Drizzle's D1 adapter; the home page calls this database directly.
- `app/account.ts` stores accounts/sessions in the same database.
- `app/private-crypto.ts` requires the private R2 `PRIVATE_FILES` binding.
- Multiple integration modules read configuration from Cloudflare's environment.
- The Worker entry implements request origin/body checks and request-scoped connector context; those behaviors must be preserved by any Node adaptation.
- `npm start` currently launches local Wrangler development with local persistence, not a standalone Node production server.
- The existing README explicitly requires preserving Sites/Cloudflare integration, D1 migrations and private R2 storage.

A production Hostinger migration needs a tested Node-compatible backend strategy with access to the actual database/files and securely configured runtime secrets. Empty local storage, fake bindings, bypassed authentication or a development Wrangler server are not substitutes. No database migration, secret rotation, DNS edits or live redeployment was performed.

## Acceptance before production deployment

1. Produce a real Node-compatible build.
2. Run `npm run verify:standalone` successfully against the configured backend.
3. Verify login, authorized role pages, private file access and denial of unauthorized access.
4. Verify read/write behavior against controlled fixtures without changing live customer records.
5. Deploy through authenticated Hostinger access and verify actual public content, assets and runtime logs.

Keep the PR in draft until these checks pass.
