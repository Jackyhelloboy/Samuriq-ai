# Pair evidence operations — Samuriq AI V6

## Launch checklist

1. Owner configures the actual client URL, pair-hour rate, target period and deadline. The existing Hindi recording project uses task invitation code **IMCIAD**.
2. Owner or manager opens **Projects → Training & evidence**. Add the real work and registration video links, optionally an introduction, and clear project terms. Enable TL-managed pair evidence. Every configured video is required.
3. Owner/manager appoints the project TL, who shares the team invitation. Both participants register their own website accounts, accept their disclosed team rates, and mutually confirm a permanent pair. Named partners can accept their pair lead's team invitation after receiving the pair invitation; unrelated existing applications cannot be silently moved.
4. Contributors complete all tutorials and confirm the exact task code and matching intended client email/username. For Google Drive or unsupported video providers, coordinators must check completion manually. Their verification note applies to **all required lessons**, each of which must have been opened.
5. A folder creator (manager, TL, or contributor) sets up `Samuriq AI Recording / <PAIR-ID> / <participant name 1>` and a sibling `<participant name 2>` folder. Create folders only for selected real pairs, not every account. Parent folders stay restricted. Each contributor receives editor access only to their own folder; assigned reviewers receive viewer access. Do not make folders public to simplify sharing.
6. Each person connects their own folder. TL verifies viewer access to both. The same physical folder cannot be reused for two people in one project. The portal stores links; it does not create folders, inspect sharing, or count files automatically.
7. Management approves the application and confirms community membership. Only an active project, active assigned team, approved permanent pair, current tutorial/terms acceptance and both verified folders permit client launch. Telegram is on the right side of the approved project desk at desktop widths.
8. Activate from the project portfolio only after links, tutorials, terms, task code and current schedule are configured. The migration enables this workflow for the existing Shenfei recording project; it opens it only when the necessary configuration is present. Missing tutorials are never replaced with fabricated URLs.

## Daily delivery

- Each participant takes a completion screenshot immediately after **every section**, uploading to their own folder. Suggested filename: `YYYY-MM-DD_section-ID_participant.png`.
- TL opens **Team → Pair evidence register**, chooses the work date, opens both folders, checks every section and records unique section IDs, shared recording minutes, per-person screenshot counts, attendance and useful feedback. Counts are manual, not client-platform telemetry.
- A worked-day review requires at least one screenshot from each person per counted section. No-work or needs-help records carry zero production counts. Future work dates and dates outside the target period are rejected. Missing TL reviews mean **awaiting review**, never automatic contributor absence.
- Contributors see a read-only daily table, their own folder, pair/contributor IDs, deadline target and TL feedback. They use Support to dispute any count. Queries or attempted role switches cannot reveal a different contributor's dashboard.
- Managers follow team completion and mandatory daily TL reports. The evidence register can export an Excel-compatible CSV for managers/owner, and for TLs only when the owner enables special export permission. Ordinary helpers cannot export.
- Only the owner may copy a TL-reviewed pair day into **pending client-QC reconciliation**. An existing report is never overwritten. After copying, the TL record is locked against changes; corrections require management. Client QC is recorded separately, then earnings can be posted through the existing immutable ledger.
- Commission is only the disclosed approved rate difference on actual payable work. No client-approved payable work means no earned commission. TL attendance/report submission alone never creates a payment. Pair-hour rates are split across the two people's individually accepted rates; no duplicate pair-hour payment is created.

## Access and privacy

- Team leaders review assigned evidence and normal team tickets; they cannot appoint staff, ban users, approve payable QC, reveal bank details or transfer funds.
- Owner/managers can delegate **review**, **contact** and **tickets** independently to an active member of a single team. Every use rechecks the grant and membership. Helpers cannot expand grants or inherit staff/TL rate, export, QC or payout powers. Revoking a grant removes access on the next request.
- Consent-based contributor contact numbers are visible only to assigned TLs, contact-authorized helpers and management. Staff numbers stay hidden.
- PAN number/document collection is disabled server-side and removed from payment onboarding. Historical encrypted records stay owner-private pending a retention decision. Bank data remains encrypted; full account access and payout authorization remain owner-only. Shared family bank accounts require explicit owner review and account-holder consent, independent of PAN.
- No system can prove that two accounts represent distinct people without additional verification. TLs must reconcile website identity, permanent pair, community handle, client registration evidence and invitation code.
- The external client site has no API or vendor access. The portal gates its own launch links; after navigation the address is visible. It cannot prevent direct registration, enforce the client invite code on the client's server, prove external activity or verify external account email automatically. Client cooperation is necessary for stronger restrictions.

## Tickets and retention

Contributors can contact their TL or privately escalate to managers. Management assigns deadlines, forwards management/site issues privately to the owner and reviews TL resolutions before closing. Open, in-progress, resolved-but-unclosed and overdue tickets are retained. Only **closed** tickets at least seven days past `closed_at` are eligible for purge. Reopening clears `closed_at`; a later closure restarts retention. The cleanup removes support messages and redacts ticket-specific audit text, preserving minimal audit, project evidence, bank, QC and financial records.

The owner-only Site tool `purge_closed_support_tickets` runs this same fixed cleanup, with no arbitrary record or SQL arguments. Use the linked daily Site task once its connection is verified. Management also has **Run closed-ticket retention now** in Support. A scheduled task being saved does not prove that a run has executed.

## Validation

Disposable local database tests cover role and pair isolation, cross-team/CSRF/stale writes, distinct normalized Drive URLs, both-person evidence checks, private dashboards, narrow helper scopes/revocation, owner-only QC reconciliation, protected earnings/commissions, PAN-free encrypted bank onboarding, family consent and closed-only ticket retention. Demo data is static and never modifies live records. No real bank transfer or client task is performed during tests.
