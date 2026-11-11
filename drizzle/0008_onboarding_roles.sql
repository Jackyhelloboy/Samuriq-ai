
CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE `client_claims` (
	`project_id` text NOT NULL,
	`username` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`project_id`, `username`)
);
--> statement-breakpoint

CREATE TABLE `managers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`granted_by` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint

CREATE TABLE `onboarding` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`version` text NOT NULL,
	`watched` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`last_tick` integer DEFAULT 0 NOT NULL,
	`nonce` text NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`accepted_at` text DEFAULT '' NOT NULL,
	`client_email` text DEFAULT '' NOT NULL,
	`client_username` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`)
);
--> statement-breakpoint

CREATE TABLE `operation_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint

ALTER TABLE `projects` ADD `onboarding_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE `projects` ADD `tutorial_seconds` integer DEFAULT 60 NOT NULL;--> statement-breakpoint

ALTER TABLE `projects` ADD `terms` text DEFAULT '' NOT NULL;