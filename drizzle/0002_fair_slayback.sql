CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_progress` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`day` text NOT NULL,
	`status` text NOT NULL,
	`minutes` integer NOT NULL,
	`units` integer NOT NULL,
	`notes` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`, `day`)
);
--> statement-breakpoint
ALTER TABLE `participants` ADD `skills` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `participants` ADD `device` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `rate` text DEFAULT 'Confirm with coordinator' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `location` text DEFAULT 'Remote' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `questions` text DEFAULT '' NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO applications (user_id, project_id, partner, experience, status, created)
SELECT id, 'speech-pair', '', 'Migrated from previous approved participant access', 'approved', created
FROM participants WHERE approved = 1 AND project = 'speech';
