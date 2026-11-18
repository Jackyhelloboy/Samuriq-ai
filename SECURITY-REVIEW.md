# Samuriq AI security and website workflow review

Reviewed: 18 November 2026. Scope: the GitHub source, direct Cloudflare Worker build, disposable local D1/R2 integration tests, and unauthenticated requests to the live website. This is a targeted engineering review, not a guarantee of no vulnerabilities or a forensic incident investigation.

## Changes

- Direct Cloudflare hosting accepts website password sessions only. Trusted platform identity headers cannot establish a user on this deployment. Google and other social login are not required.
- Telegram endpoints are unavailable on direct hosting; setup and outbound Telegram messages are disabled. Profile, project and partner forms no longer require community handles. Historical records remain intact.
- Website evidence uploads replace required Drive folders. Approved individual projects can upload as well as permanent pairs. Uploads require project membership, accepted team terms and onboarding. Reviewers must inspect actual private uploads before paired work is reconciled; client QC and payout approval remain separate decisions.
- Bank records and private screenshots use the existing AES-GCM storage mechanism. Contributors see masked bank details; only the owner can reveal full bank details. The existing encryption key must be preserved. Payment forms are hidden when encryption is unconfigured.
- External payout providers are disabled in the direct-hosted workflow. The owner can keep the payout ledger and record independently verified transfers. This release does not initiate transfers or mark work as paid automatically.
- Private account-support requests work before team assignment. Other contributors cannot open those tickets.
- Owner password changes require the current password and revoke existing owner sessions. Authentication limits cover IP/email pairs, IPs and emails, with bounded expired-record cleanup. Sign-out redirects cannot escape to another host through a backslash.
- Private responses receive no-store caching, content-type protection, framing restrictions, a base/object CSP and HTTPS transport protection. These are defense in depth, not a complete strict script CSP.
- CSV exports escape spreadsheet formula prefixes, including whitespace prefixes. Owner-only exports and bank/identity endpoints retain their authorization checks.
- Responsive forms, readable headings, keyboard focus, table scrolling, touch targets and reduced-motion behavior improve the existing desktop/mobile design.
- React, React DOM and React Server Components are patched to 19.2.9, including GHSA-xqc2-xf4c-x3h3. Compatible Cloudflare/Vite/build dependencies and affected transitive packages are updated. A known-vulnerable RSC version gate, TypeScript checks and seven security/header/CSV tests run before future Cloudflare builds.

## Validation

The build and tests use fake accounts, fake bank details, and temporary local D1/R2 state. No real bank details were exported, credentials changed, users approved, or payments initiated by these tests.

| Check | Result |
| --- | --- |
| TypeScript and local Cloudflare production-style build | Passed |
| Header/identity, response and CSV unit checks | 7 passed |
| Fresh database migrations | 37 migration files applied in disposable tests |
| Password signup/login, forged-owner denial, cross-origin write denial | Passed |
| Contributor, manager, team leader and owner access separation | Passed |
| Private screenshot upload, authorized reads, cross-account denial and duplicate rejection | Passed |
| Encrypted bank persistence, owner-only reveal and masked contributor view | Passed |
| No-team private account support and cross-account ticket denial | Passed |
| Owner current-password check and old-session revocation | Passed |
| Authentication limiting, expired-limit cleanup and safe sign-out | Passed |
| Public live export/private-file requests | Denied in the sampled requests |
| Sampled live source paths, including .env and .git/config | Returned 404 |
| Recognizable credential-pattern scan of current application source | No matches in the scanned patterns |

Local commands: `npm run build:cloudflare:local`, `npm run test:cloudflare:local`, `npm run test:security:local`. These tests cover the listed scenarios; they do not establish that every legacy business workflow is correct. Old platform-identity fixtures are not substitutes for testing real password sessions.

## Remaining checks and limitations

1. The GitHub repository is public. Public source and a public commit identifier are not themselves a disclosure of private database records. Full git-history secret scanning, GitHub collaborator permissions, repository settings and secret rotation were not completed. Any credential disclosed in conversation or elsewhere should be replaced through the relevant account's secure interface.
2. Production Cloudflare management access was unavailable during this review. The actual owner account provisioning, ADMIN_EMAIL, existing BANK_ENCRYPTION_KEY, bucket public-access settings, account access, backup settings and quotas require an authenticated management check. Code preserves runtime secrets and never generates a replacement encryption key. Replacing a key used for saved data would make that data unreadable.
3. Email ownership verification and automated email password recovery are not connected. A signup is not verified ownership of an email address. Management must verify contributor and beneficiary identity before team assignment or payment. Do not grant owner rights based on a newly supplied email alone.
4. The remaining dependency advisory concerns picomatch repeated-extglob denial of service in the build/lint dependency graph. No patched package release was available at review time. User-supplied glob patterns are not exposed by the application. Keep the development server private and recheck the advisory before further toolchain updates. Multiple npm findings may represent this one transitive root advisory.
5. Public read-only live checks do not verify private production screens or existing financial records. Authorized role workflows were exercised locally with synthetic data. Real client approval, staff decisions, beneficiary ownership and money transfers are deliberately not automated by this release.
6. Desktop public pages were visually reviewed. Mobile CSS was reviewed, but a complete real-device/mobile-browser and assistive-technology audit remains outstanding. The browser session does not have a production contributor or owner session.
7. The apex custom domain and Worker are the target deployment. The separate www hostname previously pointed to Hostinger and needs its own routing check. No email DNS records were altered by this code release.
8. This review found weaknesses and patched dependencies; it did not establish that an intrusion or data theft occurred. No finite scan can prove that no data has ever leaked.

## Automatic updates

The existing Cloudflare GitHub connection builds main-branch updates. Before this review, the main commit 0919029658ce21be07256ab28e823f90d1cce16d was verified in the live non-secret `/deployment.json` release marker. Future checks should compare that marker with the exact merged GitHub commit, rather than treating an old HTTP 200 page as proof of the latest release. Build failures must block publication. Existing remote D1 migrations remain in the configured build command.
