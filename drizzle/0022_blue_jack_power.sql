CREATE TABLE `leader_policies` (
	`user_id` text PRIMARY KEY NOT NULL,
	`max_projects` integer DEFAULT 1 NOT NULL,
	`approved_by` text NOT NULL,
	`reason` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `project_teams` ADD `vendor_from` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_teams` ADD `vendor_target_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_teams` ADD `payroll_terms` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `vendor_from` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `vendor_payee` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `vendor_target_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `team_members` ADD `payroll_terms` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `application_project_status` ON `applications` (`project_id`,`status`);