CREATE TABLE `project_permissions` (
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`team_id`, `user_id`, `project_id`)
);
--> statement-breakpoint
CREATE INDEX `project_permission_user` ON `project_permissions` (`user_id`,`project_id`);--> statement-breakpoint
ALTER TABLE `projects` ADD `work_type` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `work_instructions` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `archived_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `rate_accepted` integer DEFAULT 1 NOT NULL;