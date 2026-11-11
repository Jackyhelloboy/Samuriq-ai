CREATE TABLE `bank_claims` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_grants` (
	`user_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`approved_by` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`user_id`, `fingerprint`)
);
--> statement-breakpoint
CREATE TABLE `identity_records` (
	`user_id` text PRIMARY KEY NOT NULL,
	`pan_hash` text NOT NULL,
	`document_hash` text NOT NULL,
	`encrypted` text NOT NULL,
	`pan_last4` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`document_key` text NOT NULL,
	`document_type` text NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `identity_pan_unique` ON `identity_records` (`pan_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `identity_document_unique` ON `identity_records` (`document_hash`);--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`fingerprint` text DEFAULT '' NOT NULL,
	`last4` text DEFAULT '' NOT NULL,
	`encrypted` text DEFAULT '' NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`reviewed` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bank_details` ADD `fingerprint` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `visibility` text DEFAULT 'legacy' NOT NULL;