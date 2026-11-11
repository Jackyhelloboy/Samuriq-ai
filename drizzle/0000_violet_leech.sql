CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`telegram` text NOT NULL,
	`language` text NOT NULL,
	`project` text NOT NULL,
	`source` text DEFAULT 'direct' NOT NULL,
	`approved` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`status` text NOT NULL,
	`minutes` integer NOT NULL,
	`notes` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
