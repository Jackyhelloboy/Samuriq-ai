CREATE TABLE `evidence_folders` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`url` text NOT NULL,
	`verified_by` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `pair_reviews` (
	`project_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`day` text NOT NULL,
	`team_id` text NOT NULL,
	`pair_id` text NOT NULL,
	`sections` integer NOT NULL,
	`minutes` integer NOT NULL,
	`first_shots` integer NOT NULL,
	`second_shots` integer NOT NULL,
	`section_ids` text NOT NULL,
	`attendance` text NOT NULL,
	`feedback` text NOT NULL,
	`actor` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`project_id`, `lead_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `team_helpers` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scopes` text NOT NULL,
	`granted_by` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `evidence_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `deadline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `closed_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `route` text DEFAULT 'team' NOT NULL;--> statement-breakpoint
UPDATE projects SET evidence_required=1, onboarding_required=1, invite_code='IMCIAD',
 active=CASE WHEN (tutorial_url<>'' OR register_url<>'') AND terms<>'' AND community_url<>'' AND deadline>=strftime('%Y-%m-%d','now','+5 hours','+30 minutes') AND (target_start='' OR target_start<=strftime('%Y-%m-%d','now','+5 hours','+30 minutes')) THEN 1 ELSE 0 END
 WHERE client_url LIKE 'https://webrtcsg.shenfei-rec.com/%' AND pair=1;
