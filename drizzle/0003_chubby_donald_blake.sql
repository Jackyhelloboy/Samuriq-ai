CREATE TABLE `bank_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bank_details` (
	`user_id` text PRIMARY KEY NOT NULL,
	`encrypted` text NOT NULL,
	`last4` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `launches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `project_progress` ADD `proof_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_progress` ADD `client_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_progress` ADD `review` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_progress` ADD `review_note` text DEFAULT '' NOT NULL;