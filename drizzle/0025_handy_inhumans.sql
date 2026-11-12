CREATE TABLE `current_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `membership_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`team_id` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text NOT NULL,
	`snapshot` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `membership_history_lookup` ON `membership_history` (`user_id`,`project_id`,`effective_from`,`effective_to`);--> statement-breakpoint
CREATE TABLE `policy_acceptances` (
	`user_id` text NOT NULL,
	`version_id` text NOT NULL,
	`role` text NOT NULL,
	`accepted_name` text NOT NULL,
	`accepted_at` text NOT NULL,
	`content_hash` text NOT NULL,
	PRIMARY KEY(`user_id`, `version_id`, `role`)
);
--> statement-breakpoint
CREATE TABLE `policy_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`duties` text NOT NULL,
	`published_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_restrictions` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`state` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `team_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`max_uses` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`revoked_at` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_code_unique` ON `team_invites` (`code`);--> statement-breakpoint
CREATE INDEX `invite_team` ON `team_invites` (`team_id`);--> statement-breakpoint
CREATE TABLE `team_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`target_team_id` text NOT NULL,
	`payload` text NOT NULL,
	`cutover_day` text NOT NULL,
	`reason` text NOT NULL,
	`requested_by` text NOT NULL,
	`approved_by` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	`completed` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `leader_reports` ADD `contacted_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leader_reports` ADD `unresponsive_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `effective_from` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `invite_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `join_receipt` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `launch_member_project_time` ON `launches` (`user_id`,`project_id`,`created`);
--> statement-breakpoint
INSERT INTO policy_versions(id,body,duties,published_by,created) VALUES ('v10-2026-11-12','Samuriq AI coordinates client projects as a vendor. Client accounts, tasks, recordings and QC run on the client platform. Samuriq records registration, training, team assignment, evidence, daily reports and approvals. Telegram is the main project communication channel; the portal is the record of work coordination.
Work hours are flexible within the brief, but project deadlines and truthful daily reports are mandatory. Report by 23:59 India time unless the project specifies an earlier cutoff. Report no-work or help-needed days too. Pair tasks require two separately registered, consenting people and the approved permanent partner.
Only client-QC-approved work is eligible for payment under the accepted contract and any clearly stated target conditions. Screenshots and TL reviews are evidence, not client QC. Settlement is expected at month end on working days (Monday to Friday); a weekend month end rolls to the next weekday. Delayed QC, unresolved evidence or settlement review may move payment to a later cycle, with follow-up recorded. This is an expected schedule, not an unconditional payment promise.
Direct contributors are paid by Samuriq under their private contract. When a vendor payroll agreement applies, Samuriq pays the contracted vendor and that vendor handles member payroll under separate accepted terms. An upstream vendor budget is not a member pay offer. Earnings, upstream rates and settlement amounts remain owner-private. No joining fee is required. Never share an OTP, bank PIN, password or another person''s account.
Use one genuine account, protect client data and obtain required recording/upload permission. Upload each required completion proof promptly to your own restricted Drive folder. Give viewer access only to assigned reviewers; Drive and Telegram permissions require manual handover. Fabricated screenshots, duplicate work claims, account sharing and bypassing approvals are prohibited.
Managers and the owner can reassign teams, block access or remove people from a project with a recorded reason. Financial changes require owner review and new member acceptance where applicable. Historical work, banking and financial records are retained. A later reporting failure or removal does not automatically erase previously approved work. Raise discrepancies through Support; private escalations bypass TLs.
Read and accept each new policy version and the separate project/client agreement before new work. Receipts record the policy version, assigned role, content hash and time. Material changes are prospective; recorded agreements and posted payments remain retained.','{"contributor":"Keep profile/contact information accurate; complete training; join the assigned Telegram community; follow the project brief and client rules; meet deadlines; upload each required proof; report daily; review feedback and raise discrepancies promptly. Do not start work before approval.","tl":"Follow up every assigned contributor daily; verify active, inactive and help-needed states; check evidence without claiming client QC; publish truthful counts and feedback; submit a daily report with follow-up/no-response counts, blockers and next steps; resolve tickets before deadlines or escalate to management. Protect team data. Do not grant roles or control another team. Honor private vendor payroll responsibilities where contracted.","helper":"Act only within the team/scopes delegated by management. Record evidence checks and follow-ups truthfully, protect contacts, handle assigned queries and escalate to the TL or manager. Do not change roles, banking, targets or client QC.","manager":"Monitor TL daily reports, missing updates and client deadlines. Manage documented handovers, restrictions and escalations. Preserve pairs, historical records and privacy. Only the owner approves financial-contract changes, client-QC posting and settlements. Do not share unrelated team data.","owner":"Keep project/client requirements, policies, deadlines and access accurate. Review client QC and disputes fairly, protect banking and data, authorize prospective financial changes, reconcile direct/vendor settlements and communicate expected delays. Do not present screenshots, internal reviews or unconfirmed transfers as client approval or payment."}','platform-release','2026-11-12T00:00:00Z');
--> statement-breakpoint
INSERT INTO current_policy(id,version_id) VALUES ('platform','v10-2026-11-12');
--> statement-breakpoint
UPDATE team_members SET effective_from=substr(joined,1,10) WHERE effective_from='';
--> statement-breakpoint
INSERT INTO notices(id,title,body,created) VALUES ('v10-policy-release','Accept your updated role agreement','Payment depends on client QC and accepted contract conditions. Settlement is expected at month end on working days. Accept the new role responsibilities; TLs must follow up daily and submit truthful reports. TL invitations now expire and have contributor limits. Historical work and payments remain retained.','2026-11-12T00:00:00Z');
