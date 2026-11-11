# Samuriq AI — operator guide

This is the full application source, including frontend, server actions, database schema/migrations, assets and tests. It is not just a downloaded webpage. Live participant records, bank records, passwords, tokens and encryption keys are deliberately excluded.

## Current recording assignment

- Deadline: 18 November 2026, end of day in India.
- Target: 14 shared recording hours per permanent pair. Flexible times; no fixed shifts.
- The initial target window is 11–18 November. For following weekly assignments, set the next seven-day period and target in Admin → Projects.
- Pay: ₹500 per client-QC-approved pair-hour, ₹250 per person. Fourteen fully approved hours would be ₹7,000 per pair / ₹3,500 each. Rejected or unapproved minutes do not qualify.
- A report counts shared recording time once: a 60-minute session with two partners is 60 minutes, not 120.

## Daily workflow

1. Each person signs in and completes their own profile. Current hosting uses Sign in with ChatGPT.
2. One pair lead applies with the permanent partner’s exact sign-in email and a Telegram or Discord handle.
3. The partner signs in with that email and confirms the pairing. Confirmed participants cannot form another confirmed pair in the same project. A partner cannot be changed through the normal interface after confirmation.
4. In Admin → Overview, verify both people and their community identities, then approve the application. Registration by itself never grants work access.
5. Both approved partners may open the client platform and log in there separately. For the existing recording assignment, the required invite code is IMCIAD. The website cannot enforce this code on a third-party platform.
6. The pair lead submits one daily update: sections completed today, actual shared recording minutes, client account/submission ID and permitted Drive evidence. An update replaces the same day’s earlier totals; it does not add to them.
7. Admin → Team & targets shows missing check-ins, target progress and daily output. Download the client CSV to open in Excel and send to the client. It excludes bank details, email addresses and private evidence URLs.
8. Admin → Proof & reports: review evidence; record the client’s QC reference and approved minutes. Approved minutes cannot exceed reported minutes. Editing a report resets its QC approval and approved minutes.
9. Each person may add bank details later. Admin → Payments supports an audited owner-only reveal for manual payout preparation. Transfer funds using your own bank after reconciling client settlement, approved work and previous payments. The site does not initiate transfers or maintain a paid/unpaid ledger.

## Telegram / Discord setup

Admin → Projects → edit → Private Telegram / Discord invite accepts your project invite URL. The approved workspace displays that link. The general community link remains separate.

For Telegram, use a private project group and an invite requiring admin approval. Match join requests to approved website profiles and allow only admins to add members. Do not publish the private project invite in ads or the public channel.

For Discord, use a private work category visible only to an Approved Worker role. Manually assign that role after website approval; keep general onboarding separate.

The site’s community-verified checkbox records your manual verification. No bot token, Telegram account or Discord bot is connected in this source. It cannot approve/remove platform members automatically. Website approval does not itself change chat-platform permissions. For someone who stops reporting, follow up in the community and change their application status if needed; the dashboard does not automatically penalize missing reports.

## Running the source

Requires Node.js 22.13 or newer and npm. Install with `npm ci`, then `npm run build`. The app targets Cloudflare Workers/D1 through the bundled Vinext integration; it is not a static HTML site. `npm run dev` starts development. Initialize D1 using every SQL file in `drizzle/`, in filename order. The built local worker uses `dist/server/wrangler.json`; use Wrangler's local D1 commands for a local database. Run `python scripts/test-vendor.py` after building for isolated fixture-only checks.

Runtime settings: `ADMIN_EMAIL` is the authorized owner's sign-in email; `BANK_ENCRYPTION_KEY` is a cryptographically random 32-byte key expressed as 64 lowercase hexadecimal characters. Keep it secret and backed up; changing it prevents decryption of existing bank records. Optional existing community settings include `COMMUNITY_JOIN_URL`, `HINDI_JOIN_URL`, `TELUGU_JOIN_URL` and related admin links. Never place secrets in frontend code or Git.

For deployment outside Sites, provision Cloudflare D1 and an authentication gateway. The current application expects trusted identity headers injected by Sites; never expose a deployment that trusts identity headers sent directly by arbitrary visitors. Replace the authentication adapter with your chosen provider if moving to another host. The `.openai/hosting.json` file identifies the existing Sites project; do not use that identity to create an unrelated site.

## Limits without client access

No client API is needed for this manual workflow. A portal launch records a click, not completed work. Client URLs become visible after opening. Evidence, declared IDs and pair locks cannot detect all outside accounts or duplicated client submissions. Reconcile your team roster and client IDs with the client’s daily/QC records before paying. The site cannot block direct access to a platform owned by the client.

## Version 8 — company design and owner controls

The public admin link is removed. Use the normal **Sign in** button. The approved `ADMIN_EMAIL` account is routed to the owner console; all other accounts use the contributor workspace. Authentication remains Sign in with ChatGPT, not a separate locally stored email/password system.

**Admin → Controls** lets the owner pause applications, daily reports, bank onboarding and client launches. These controls are checked server-side. Community and announcement switches control contributor visibility. No records are deleted when a feature is paused.

**Admin → Projects → Import projects from CSV** accepts up to 100 rows per upload (1 MB). Download the blank template from that screen. CSV imports create drafts; review each real client brief before publishing it. The contributor directory displays up to 50 actual published projects per page. No demonstration jobs are published to fill the list.
