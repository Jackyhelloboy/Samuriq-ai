ALTER TABLE `pair_reviews` ADD `first_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `pair_reviews` ADD `second_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `project_folder_unique` ON `evidence_folders` (`project_id`,`url`);
--> statement-breakpoint
UPDATE support_tickets SET closed_at=updated WHERE status='closed' AND closed_at='';
