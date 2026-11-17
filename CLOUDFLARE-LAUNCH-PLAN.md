# Samuriq AI: Cloudflare launch and usability plan

Budget: no new paid subscriptions or purchases. Target domain: samuriqai.in. Source: Jackyhelloboy/Samuriq-ai, main.

## 1. Make the existing application deployable

Keep its Cloudflare Worker, D1 database, private file encryption and role restrictions. Use a Cloudflare build instead of the incompatible Hostinger Next.js standalone deployment. Retain the existing Sites build as a separate path.

Implemented commands:

| Purpose | Command |
| --- | --- |
| Disposable local Cloudflare build | `npm run build:cloudflare:local` |
| Identity protection tests | `npm run test:hosting` |
| Local D1/password/navigation checks | `python scripts/test-cloudflare-local.py` |
| Real Cloudflare production build | `npm run build:cloudflare` |
| Publish verified production artifact | `npm run deploy:cloudflare` |

The production build requires the actual `CLOUDFLARE_D1_DATABASE_ID`. Optional configuration: `CLOUDFLARE_D1_DATABASE_NAME`, `CLOUDFLARE_WORKER_NAME`, and an existing approved `CLOUDFLARE_R2_BUCKET_NAME`. Local IDs and generated configuration live in ignored `.cloudflare/`; local test builds cannot be deployed by the deployment command. No resource is created and no subscription is purchased by these scripts.

## 2. Connect the actual account and data

Account sign-in is required. First inspect the account's plan, Workers, databases, buckets, domains and existing application data. Reuse the correct resources after verifying ownership and intended environment. Do not select an unrelated database, initialize an empty production database over an existing deployment, or rotate encryption keys.

Verify the existing owner password account before publishing: public registration intentionally blocks the owner email, so a fresh empty database is not sufficient. Preserve existing participant accounts, password hashes, policies, projects, sessions and private records. Back up data before any migration. Review the existing 36 SQL migrations against the actual database before applying anything remotely.

Runtime configuration includes `ADMIN_EMAIL`, the existing `BANK_ENCRYPTION_KEY` and any enabled integration credentials. Configure secrets through the authenticated provider interface; never put real values in GitHub, build logs or chat. Build variables do not substitute for runtime secrets. Keep platform-managed identities disabled for direct Cloudflare hosting; password sessions remain supported.

## 3. Respect the zero-spend requirement

Use Workers Free and D1 Free only. Do not enable Workers Paid, purchase a plan, create an R2 subscription or enable paid integrations automatically. Cloudflare's free quotas are usage allowances, not a verified capacity guarantee for this application.

R2 has a free allowance but usage beyond it can be billed. Private uploads are part of this application, so the complete deployment command requires an existing approved private bucket. If the account has no suitable zero-spend storage arrangement, stop before deployment and present the specific storage decision; do not quietly replace private storage with public files or disable upload requirements.

Before launch, measure Worker CPU for public pages and password operations, database rows scanned/written and uploaded file growth. Optimize indexed reads and rendering based on those measurements; preserve the current password hashing strength. Existing screenshot size/rate limits do not by themselves guarantee zero R2 charges. Establish usage monitoring and an enforced upload budget before enabling production uploads.

Official limits: https://developers.cloudflare.com/workers/platform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/ ; https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/r2/pricing/

## 4. Make the website easier to use

Implemented first improvements:

- A clear three-step home page: find an opportunity, create an account, continue work.
- Direct links to projects, login/registration and the contributor workspace.
- Mobile-friendly cards, keyboard focus styles and a skip-to-content link.
- Show at most 12 project previews on the home page, with the full project board still available.
- Remove an unused feature-settings lookup from every home-page request.
- Reject visitor-supplied platform identity headers on direct Cloudflare deployments.

Next improvements after observing the deployed app: check mobile onboarding and tutorial completion; consolidate duplicate navigation labels; show actionable empty/error states; confirm accessible forms and private support flows. Preserve all role permissions and owner-only financial data. No invented project availability, fake client links or payment promises.

## 5. Verify before switching the domain

First publish to a Cloudflare preview/workers.dev address after the backend and storage requirements are satisfied. Verify real home-page content and assets, registration/login, owner and contributor separation, project requirements, private file access, cross-origin write denial and enabled integrations. Measure the free-plan CPU/usage limits; local tests cannot establish production CPU capacity.

Only then inspect samuriqai.in's current DNS, including MX, SPF, DKIM, DMARC and verification records. Save a rollback snapshot. Present any required nameserver replacement or record deletion for explicit confirmation before performing it. Preserve email. Verify HTTPS and both apex/www behavior after connection, and keep the old deployment available for rollback.

## Completion criteria

The work is complete only when the actual Cloudflare account is connected, the correct live data/storage is bound, tests pass on the published application, the domain resolves to the verified app, and the zero-spend constraints are understood and enforced. A successful build or a repository pull request alone does not mean the website is live.
