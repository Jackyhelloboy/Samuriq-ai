# Samuriq AI · V8 operations update

## Roles and data boundaries

All real roles use separate accounts and server-side grants. The workspace selector only lists roles assigned to the current identity. Owner and manager supervision retains the caller's identity and audit trail. TLs cannot select another TL's team. Helpers have only explicitly delegated review/contact/ticket scopes and current membership is checked on every privileged operation.

The owner alone can read posted earnings, commissions, payout orders and full bank details. Contributors manage their own masked bank profile; TLs and managers do not receive payout balances. Published contractual rates and accepted enrollment terms remain available so contributors can give informed consent. Daily work records are operational reports, not daily transfers.

## Enrollment and referrals

Public project cards include share controls. TL invitations preserve the team code through sign-in and profile setup. Accepting a TL invitation pins membership to that team. Direct application performs a single atomic SQLite INSERT…SELECT into the least-populated eligible project team. Suspended leaders, inactive teams and protected staff are excluded. A named partner follows their already-assigned pair lead. The stored rate is frozen and direct-assigned users must explicitly accept it before client launch.

Applicants without an eligible team wait for management. Create eligible TLs, then use Project roster → Route waiting applicants (up to 100 per action). New applications cannot be approved without team assignment. Existing memberships are never silently moved. Contributors already in an active project team must request permission from every current TL before applying to another project. Closing or expiring a project releases that application restriction.

## Client work and evidence

Owner → Project workflows configures recording, general tasks, image/video annotation, 3D labeling, POV or evaluation reporting. Each project can provide its own task instructions, tutorial requirements, community, permanent pairing, evidence policy, targets and client URL. Typed completed reports require a client batch/submission reference. Pair evidence remains TL-reviewed; client QC remains distinct.

One-use, expiring launch tickets gate navigation from Samuriq. They do not authorize Samuriq to control another company's system. Without client API/access control cooperation, direct visits or registrations at the external client URL cannot be prevented, nor can client activity or QC be observed automatically. Framing also depends on the client's browser security headers. Drive permissions and screenshot counts are reviewed by the assigned team; connecting a folder does not automatically inspect its files.

## Month-end settlement

Work and QC can be recorded throughout the month. Payout preparation, manual transfer recording and Cashfree submission reject work whose calendar month has not reached its last day in Asia/Kolkata. Overdue closed months remain eligible. The owner ledger supports work-month filtering. Client QC, sufficient vendor funds and beneficiary review are still required; this is not an automatic payment promise.

Cashfree remains disabled until valid owner-provided Payouts credentials, provider onboarding, authentication setup and end-to-end testing are complete. Sandbox success is not a real payment. Unknown transfer outcomes must be reconciled against the original transfer ID. No real payment has been sent during development.

## Closure and retention

Closing a project marks its operational workspace archived and revokes client launches and daily submissions. Contributor evidence views and active dashboards omit archived projects. Reopening restores access subject to normal approval gates. Profiles, audit trails, evidence history and financial records remain in protected storage for reconciliation; project closure does not destructively delete people or payment records.

## Demo and validation

/demo/login offers synthetic owner, manager, TL, helper and contributor workspaces. No shared production passwords or live accounts are created. Phone samples are explicitly fictional and calling is disabled; real consented project contact numbers use tel: links.

Run the framework build and scripts/test-v8.py plus the prior platform, vendor, leadership, evidence, V6 and V7 regressions. Test scripts use disposable local D1 fixtures, not production records. V8 tests cover atomic concurrent balancing, pinned referrals, explicit terms acceptance, cross-team denial, helper revocation, owner-private finance, additional-project approval, monthly settlement, typed reporting, announcements and archive retention.

Browser review of this update was unavailable after the browser usage limit was reached. A passing local regression suite does not establish a production concurrency capacity or replace provider testing, ongoing backups, monitoring and account-recovery operations.
