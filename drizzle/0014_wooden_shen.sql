CREATE TABLE `project_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`day` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'recorded' NOT NULL,
	`created_by` text NOT NULL,
	`created` text NOT NULL
);
