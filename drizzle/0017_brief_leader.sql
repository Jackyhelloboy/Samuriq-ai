CREATE TABLE `launch_tickets` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`expires` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `launch_ticket_expiry` ON `launch_tickets` (`expires`);--> statement-breakpoint
ALTER TABLE `projects` ADD `external_allowed` integer DEFAULT 0 NOT NULL;