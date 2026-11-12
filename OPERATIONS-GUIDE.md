# Samuriq AI — project operations release

## Start here

The landing page displays real published projects as compact cards. A contributor selects a project, signs in, completes their profile, finishes that project's configured tutorial, accepts its current terms, and applies. Permanent-pair projects also require the second participant's consent. Coordinator approval and manual community-identity verification unlock the project desk.

Current recording terms remain 14 shared recording hours by 18 November 2026, with flexible timing, and ₹500 per client-QC-approved pair-hour (₹250 each). Shared recording time is counted once, not once per person. Configure new target dates and requirements independently for each future project.

## Owner and manager accounts

Use the normal website sign-in. Existing ChatGPT sign-in is retained as an alternative. Public account creation cannot claim the reserved owner email. The owner can configure their own email/password sign-in from **Security**, after signing in as the authorized owner. No preset password is included. Passwords use salted PBKDF2; session tokens are hashed in the database and placed in Secure, HttpOnly, SameSite cookies. Sign-in and account-creation attempts are rate limited. Email ownership verification and email-based password reset are not connected to a mail provider.

**People & roles** allows only the owner to appoint or remove a manager from an existing contributor account. Verify the person's identity first. Manager grants use account IDs, not an unverified email string. The interface cannot appoint another owner/admin.

Managers can support onboarding, review applications, view project rosters and reports, and mark evidence reviewed or needing correction. They cannot reveal banking information, download the private registration export, edit owner settings, appoint managers or record client-approved payable minutes. They cannot change an already client-approved report. Revocation is checked on the next server request.

## Configure a project

In **Projects**, configure its brief, requirements, eligibility, pair requirement, compensation, target period, client destination, invite code and private community URL. Add a tutorial URL, required playback duration and project terms, then enable **Require tutorial and terms before applying**. Existing projects retain their prior access until you configure and enable this requirement; no fictitious tutorial is supplied.

- HTTPS MP4/WebM/Ogg and YouTube support recorded playback progress and forward-seek restrictions in the provided player.
- Google Drive previews, Vimeo and arbitrary external video pages require coordinator verification from **Onboarding**, with an audit note. Opening a link or checking a box is not proof of viewing.
- The required duration is entered by the owner; match it to the full tutorial length.
- Playback telemetry cannot prove attention or prevent a determined user from manipulating their browser. Material tutorial/terms/duration changes invalidate prior acceptance for future access.
- The website records the contributor's intended client username and requires their declared client email to match their Samuriq account email. It cannot inspect the actual client's registration data without client access.

## Daily work and client reporting

Approved contributors use **Project desk** to open their private Telegram/Discord destination and client workspace. The client may block iframe embedding; a new-tab option is provided. The URL is withheld from unapproved portal users, but becomes visible after an approved person opens it. The client owns its platform and can still allow registrations outside this portal.

One pair lead submits the shared daily output: sections completed, actual shared recording minutes, client submission ID and permitted Google Drive proof. A same-day update replaces prior totals and resets the report's QC approval. Partners' portal access uses the lead's shared report. Missing check-ins are flagged; portal client-launch access pauses after two missed days and is restored when a current report is submitted. This does not prove inactivity or automatically determine payment eligibility.

**Team & targets** and **Project roster** show who is approved, reported today, missing a check-in or below target. **Proof & reports** separates coordinator proof review from owner-entered client QC approval. Approved minutes cannot exceed reported minutes. Payouts remain manual; the site does not transfer funds or maintain a paid/unpaid ledger.

## Private records and exports

Contributor, application, onboarding and report records are stored in the protected application database. **Onboarding → Download private registration CSV** is owner-only and contains website/client identity declarations and terms acceptance. It excludes bank details. Import this CSV into your private Google Sheet if needed. Automatic Google Sheets synchronization is not connected in this release: Sites app-integration eligibility could not be established with the available tools. No public Sheet or unauthenticated write endpoint is used as a substitute.

The client-ready daily CSV excludes banking data, private proof links and registration emails. Formula-like spreadsheet values are escaped. Bank details remain separately encrypted with `BANK_ENCRYPTION_KEY`; preserve that key across deployment. Only the owner can reveal them with a same-origin POST; access is audited.

## Community setup

Use a private Telegram group with admin-approved join requests, or a Discord role-restricted work area. Match members to approved website profiles. Website approval does not automatically change Telegram/Discord permissions. The imported Telegram webhook support requires a bot token and webhook secret; without configuration, it is not a live bot connection. A bot contact message never grants project approval or community verification by itself. The owner-triggered reminder endpoint requires same-origin authentication or a separate scheduler secret. No external messages were sent as part of this release.

## Content and future changes

**Content studio** edits safe text blocks and buttons in four page areas: landing page, project directory, contributor workspace and footer. It does not execute pasted JavaScript, HTML or server code. Use GitHub for application code changes and deploy the reviewed build. **Controls** pauses individual workflows server-side without deleting existing records. CSV project import accepts up to 100 real briefs per upload, saved as drafts. Project browsing displays up to 50 real published projects per page.

## Source and deployment

The complete source includes frontend, server actions, migrations, assets and local tests. Production credentials, bank records, account records and dependency folders are excluded from the ZIP. Apply SQL migrations 0000 through 0008 in filename order. Migration 0008 adds roles, onboarding records, client-username claims, rate limits and operation auditing; the imported 0005–0007 add prior GitHub features.

Requires Node.js 22.13+, npm and Cloudflare Workers/D1 through the bundled Vinext integration. Run `npm ci`, `npm run build`, then `python scripts/test-platform.py` and `python scripts/test-vendor.py`. Tests use isolated local databases, fixture identities and a dummy bank key, never the live participant database.

For another hosting platform, replace the Sites trusted identity adapter with a supported authentication provider and provision the Worker/D1 bindings. Never trust arbitrary browser-supplied identity headers on an independently deployed server.


## Pro5 release — projects and payment identity

- Public project tiles show ACTIVE, UPCOMING or CLOSED. Closing a listed project keeps its tile visible but blocks contributor briefs, onboarding, applications, reporting and client access. Owner and managers can activate/close projects; only owner edits private links and configuration. Expired project schedules must be corrected before reactivation.
- Five demonstration tiles are clearly marked LAYOUT PREVIEW and closed. Disable “Preview projects” in Controls to remove them. They are not real hiring opportunities.
- New project categories include 3D hand labeling and video labeling. Each real project retains its own tutorial, requirements, terms, community URL, client URL, schedule and rates.
- The tutorial player provides a play button without pause, seek or speed controls. Direct video and YouTube use elapsed playback credit. The detected full duration increases the configured minimum. This is a viewing gate, not proof of attention or tamper-proof DRM. Drive and unsupported embeds require a coordinator’s documented manual verification.
- Contributors submit their own PAN before bank details. Identity records and documents are encrypted using the existing BANK_ENCRYPTION_KEY. Do not rotate or lose this key without a migration. Private R2 binding PRIVATE_FILES stores encrypted documents; no public file URL is issued.
- PAN format and keyed duplicate checks run automatically; unique database indexes prevent PAN/document reuse across users. PAN authenticity is NOT verified with Income Tax/Protean. Integrating an authorized verification provider requires credentials and a separate implementation. A manual-reviewed status means only that the owner reviewed documents.
- Owner console → Identity & requests supports masked records, explicit POST-only reveals/downloads, manual review, identity appeals and family-bank requests. Managers cannot access these records. Never export PAN documents into ordinary Sheets/CSV.
- Existing bank records must be indexed by the owner before new bank updates are accepted. Conflicting old shared accounts remain unindexed until the owner reviews each contributor’s unique PAN and approves a family request. Old encryption remains compatible.
- A family exception applies to one exact bank fingerprint. Both original holder and applicant need different manually reviewed PANs; the owner must record relationship, consent and a review note. Sharing a PAN is never enabled. PAN correction/recovery appeals require owner assistance; automatic account merging is not implemented.
- PAN deduplication does not guarantee one physical person. Document authenticity, rightful account ownership and client work/QC still need human or provider verification. Bank details are for payout coordination; no transfer is initiated automatically.

## Project team leaders, tickets and earnings

### Roles and supervision

- Owner: appoint/revoke managers; appoint project TLs; approve proposed TL contributor rates and special activity-export permission; view all supervisor workspaces; review PAN/bank details; post earnings and authorize payouts.
- Manager: appoint registered non-staff contributors as project TLs; suspend/restore teams and contributor accounts; oversee every TL workspace; see consented contributor contacts; assign and close support tickets. Cannot approve special TL rights, reduced rates, client QC payable minutes, identity reviews or payouts. Staff phone numbers remain hidden.
- Team leader: access only their assigned active project teams, consented member contacts and activity; propose rates for future joins; reply to team tickets; mark resolutions for manager review; submit mandatory daily TL reports. Cannot ban/delete users, modify participant reports, approve applications/client QC, access PAN/bank records, redirect payouts or self-grant access.
- Contributor: join a project team through its invitation; accept the disclosed rate and commission; complete project tutorial/application/approval; view own earnings, payout status and TL contact; raise a private manager escalation hidden from TLs.

Supervisor views do not impersonate another account. All actions use the actual owner/manager identity. A TL assignment is project-specific. A contributor has at most one team per project and joins before applying. Existing applications cannot be silently reassigned or have their rates changed. Appoint a new team and contact management for any migration; this release intentionally has no silent bulk reassignment or destructive deletion.

### First setup

1. Ask each proposed TL to sign in, complete a contributor profile, add a valid phone number and consent to project coordination.
2. Owner/manager opens Team leaders → Appoint project TL. Project hourly pay must already be configured. For paired recordings the project hourly rate is the pair budget; it is split equally into the standard individual rate.
3. TL opens Team workspace and proposes a lower contributor rate if required. The owner approves it. The difference from the individual project budget is the disclosed TL commission. Existing member rate snapshots do not change.
4. TL shares their project invitation URL. Each person registers and explicitly accepts their own rate. Joining does not bypass project approval, community verification or tutorial gates. Both pair members must join/register separately for their own earnings attribution.
5. TL follows the roster and posts the daily coordination summary, blockers and next steps. Snapshot counts are calculated from website reports, not user-entered counts. Manager follows missing TL reports and tickets in Team leaders.
6. Contributors can use Support → Private escalation to bypass their TL. The TL cannot read the private ticket. A TL resolves normal tickets; only a manager/owner closes them. Staff-created tasks can be assigned among active TL teams for the same project; contributor tickets stay with the contributor’s own team.

Phone numbers are self-declared, not OTP verified. Do not treat them as identity verification. TLs see only their own members’ consented numbers; managers see consented contributor numbers. Owner/manager numbers are filtered out. TL activity CSV has no email, phone, PAN or bank details and requires an owner-granted special permission.

### Earnings and payouts

- Owner records client-QC-approved minutes in Proof & reports, then opens Payout ledger to post the report.
- Posting atomically creates immutable earning lines and locks the report against contributor changes or further QC edits. It credits each registered permanent pair member once at their own frozen individual rate and separately credits each TL’s disclosed commission. Integer paise and reconciled rounding keep the total within the pair budget. Reports that are not QC approved cannot be posted.
- Normal contributors use the configured individual project rate at posting if no team rate was accepted. Configure pay carefully before approving work. This release supports hourly accounting; non-hourly tasks should use their recorded approved-work duration until a separate per-unit rate model is implemented.
- Users open Earnings, also linked from Payment details, for project rates, submitted/QC hours, posted earnings, paid amounts and references. Pending QC is an estimate, not a payable balance. Work and TL commission are separately labelled. The ledger view shows up to 500 recent entries per user; admin shows 200 recent earnings and 500 orders. Large-account analytics/export should use database reporting rather than assuming these bounded views are all-time totals.
- Prepare one protected payout order per earning after checking indexed bank details, manually reviewed PAN identity and bank ownership. The bank destination is encrypted in a frozen order snapshot. The database prevents duplicate payout orders for the same earning. TLs/managers cannot alter payment destinations or submit payouts.
- For manual bank payments, the owner records an explicit confirmation and UTR/reference. This is labelled owner-recorded, not provider verified. Never mark a payment complete before the external transfer completes.
- Posted report corrections and historical reassignment require a reviewed compensating adjustment outside this release; the application blocks mutation of the original financial record. Do not erase ledger rows to work around this control.

### Cashfree adapter: not live until configured

This is a Cashfree Payouts V2 integration, not a checkout gateway. It uses server-only CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET, version 2024-01-01, CASHFREE_ENV=sandbox|production and CASHFREE_PAYOUTS_ENABLED=true. No credentials were installed and no real payment was sent during development. Arrange Cashfree-approved server authentication/IP whitelisting before enabling; public-key request signing is not implemented by this adapter. Cloudflare Workers do not provide an account-specific fixed egress IP by default, so the owner may need a supported server/gateway deployment before production activation.

Each owner-confirmed submission atomically claims an existing payout order before contacting the provider. The transfer_id is the stable order ID. A timeout/error becomes “unknown”; the application blocks resubmission. Reconcile via authenticated GET transfer status with the same ID. Acknowledgment/RECEIVED does not mean paid. ID, amount and returned bank details are checked. Only a production provider SUCCESS counts as paid; sandbox success is “test-success”. Failed/reversed/unknown orders must be reconciled with Cashfree; this release does not automatically retry or create replacement transfers. Sandbox orders must use test earnings/beneficiaries in a separate test deployment; do not consume real payable earnings for sandbox testing.

No payment webhook route is installed: status updates are fetched explicitly by the owner. Provider webhook automation, bulk-transfer batching, beneficiary name verification, official PAN verification, bank-balance reconciliation and customer checkout are not enabled. The data model and ledger can be extended for these after provider onboarding and sandbox tests. No secrets belong in GitHub, project briefs or support tickets.

## V6 workspaces and visual system

- The header workspace selector lists only contexts available to the actual signed-in account. Owner control center: /admin/dashboard. Manager delivery overview: /manager. TL workspace: /teams. Contributor workspace: /workspace. /admin remains the applications operations screen. Viewing another authorized context does not impersonate another user or grant extra permissions.
- Side navigation has collapsible groups, a compact desktop rail stored in browser localStorage, and a mobile drawer. The shared shell is used across operational, finance, identity, support and contributor screens. The top-right account menu replaces the old “Manage platform” shortcut.
- /demo?role=owner|manager|tl|contributor is a public, clearly labelled sample environment. It has six synthetic projects and twelve synthetic contributors. Demo filters, search, follow-ups, ticket status and TL reports run in component memory; reset or reload clears changes. The demo never queries live operational data, creates accounts, sends messages, pays money or grants a real role. Public sample roles are not an authorization mechanism for live routes.
- Live manager/owner dashboards show project scope, missing check-ins, TL reports due, open queries, report output and audit activity. Website reports and owner-entered client QC are the data source, not direct monitoring of the client platform. The current dashboard tables are bounded summaries; use the existing rosters and exports for full reporting.
- Active public project cards have a share control using the device share menu or copied website link. Closed/preview projects have no share or application action. Sharing a link never bypasses account registration, training, eligibility, project status or coordinator approval. TL invitations keep their separate team attribution and rate acceptance.
- /notifications is an authenticated in-app action queue. It shows pending role-appropriate work and preserves private escalation boundaries. External push, email and social messaging are not connected by this feature.
- Owner-only /admin/expenses records positive INR operating costs by project and records reversals instead of deletion. Expenses do not initiate transfers, reduce worker pay or change the earnings ledger. No automatic accounting integration or expense-receipt file upload is added; use a reference label without sensitive bank details.
- First sign-in without an explicit return destination chooses the account’s actual role home. Return destinations from project and team registration remain intact.
