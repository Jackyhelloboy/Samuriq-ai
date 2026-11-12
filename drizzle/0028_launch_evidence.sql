CREATE TABLE `evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`day` text NOT NULL,
	`section_id` text NOT NULL,
	`hash` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`reviewer` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_project_hash` ON `evidence_items` (`project_id`,`hash`);--> statement-breakpoint
CREATE INDEX `evidence_person_day` ON `evidence_items` (`project_id`,`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `member_followups` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`channel` text NOT NULL,
	`outcome` text NOT NULL,
	`note` text NOT NULL,
	`next_action` text NOT NULL,
	`actor` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `followup_team_day` ON `member_followups` (`team_id`,`day`);--> statement-breakpoint
ALTER TABLE `participants` ADD `username` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `uploads_required` integer DEFAULT 0 NOT NULL;