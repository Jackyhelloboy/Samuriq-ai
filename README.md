# Samuriq AI · V9 vendor operations

A role-scoped portal for AI recording, annotation, evaluation, POV and other client projects. Work happens on the client platform; Samuriq coordinates registration, training, teams, evidence, support and owner-controlled settlements.

## Payment responsibility

- **Direct contributor:** Samuriq pays the individual under their accepted contract.
- **Vendor team:** Samuriq settles the contracted vendor; the vendor handles member payroll under separate private agreements.
- **Pair work:** One shared recording hour includes two confirmed people. Owner calculations use the private per-person contract, without promising that upstream rate to vendor-team members.

Posted earnings, vendor settlements and full beneficiary details are owner-private. No daily earnings/commission balances are displayed to contributors, helpers, TLs or managers. Monthly vendor orders claim their source work exactly once. Cashfree is implemented but remains disabled until owner credentials and provider testing are complete.

Read [PRODUCTION-V9.md](PRODUCTION-V9.md) for current rules, assumptions and limits. Older version guides describe legacy contracts and must not override V9.

## Workspaces

| Role | Route | Scope |
| --- | --- | --- |
| Owner | `/admin/dashboard` | Finance, bank review, projects and permissions |
| Manager | `/manager` | Team operations, project workflow and assignment exceptions |
| Vendor / TL | `/teams` | Assigned team only; one active project by default |
| Helper | `/helper` | Explicitly delegated review, contact or ticket permissions |
| Contributor | `/workspace` | Own projects, evidence, private agreement and support |
| Isolated demos | `/demo/login` | Synthetic role previews; no password or live privileges |

Owner tools include `/admin/vendors`, `/admin/payouts` and `/admin/workflows`. Managers add real training and community links at `/admin/projects/workflow?id=PROJECT_ID`. A second TL project needs an explicit management policy and appointment. Query parameters do not grant roles or another vendor's team access.

## Hindi recording rollout

The existing Hindi pair project opens enrollment for the 18 November 2026 deadline. The owner selected **configure links later**. Client work remains locked if the tutorial or project community is missing. After required tutorial checks and terms acceptance, the server-gated community route opens the configured Telegram/Discord invite. Do not replace missing links with fake destinations.

## Development and verification

Use the repository's `npm run install:ci`, then `npm run build`. The existing Sites/Cloudflare integration, D1 migrations and private R2 binding must be preserved. Runtime secrets include `ADMIN_EMAIL` and `BANK_ENCRYPTION_KEY`; never commit real secrets or rotate the bank key casually. See `.env.example` and the provider setup notes before enabling live payouts.

Run these Python integration scripts **sequentially** after the production build: `test-platform.py`, `test-vendor.py`, `test-pro5.py`, `test-leadership.py`, `test-v6.py`, `test-evidence.py`, `test-v7.py`, `test-v8.py`, `test-v9.py` under `scripts/`. They use disposable local D1 fixtures and synthetic identities. The V9 concurrency check does not establish a production capacity guarantee. No client API, automated client QC observation, automatic Drive verification or prevention of direct external registrations is claimed.
