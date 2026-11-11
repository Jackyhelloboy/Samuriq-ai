CREATE TABLE `earnings` (
	`id` text PRIMARY KEY NOT NULL,
	`source_user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`day` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`team_id` text DEFAULT '' NOT NULL,
	`minutes` integer NOT NULL,
	`rate_paise` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`source_version` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `earning_source_unique` ON `earnings` (`source_user_id`,`project_id`,`day`,`user_id`,`kind`);--> statement-breakpoint
CREATE TABLE `leader_reports` (
	`team_id` text NOT NULL,
	`day` text NOT NULL,
	`actor` text NOT NULL,
	`summary` text NOT NULL,
	`blockers` text NOT NULL,
	`next_steps` text NOT NULL,
	`member_count` integer NOT NULL,
	`reported_count` integer NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`team_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `payout_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`earning_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`bank_snapshot` text NOT NULL,
	`bank_last4` text NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	`provider_ref` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payout_earning_unique` ON `payout_orders` (`earning_id`);--> statement-breakpoint
CREATE TABLE `project_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`leader_id` text NOT NULL,
	`label` text NOT NULL,
	`code` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`rate_paise` integer NOT NULL,
	`approved_rate_paise` integer NOT NULL,
	`rate_status` text DEFAULT 'approved' NOT NULL,
	`special_export` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_code_unique` ON `project_teams` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_project_leader_unique` ON `project_teams` (`project_id`,`leader_id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`team_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`team_id` text NOT NULL,
	`rate_paise` integer NOT NULL,
	`base_rate_paise` integer NOT NULL,
	`joined` text NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`actor` text NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `participants` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `phone_consent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `suspended` integer DEFAULT 0 NOT NULL;