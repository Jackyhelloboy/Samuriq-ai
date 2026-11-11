CREATE TABLE `pair_claims` (
	`project_id` text NOT NULL,
	`email` text NOT NULL,
	`lead_id` text NOT NULL,
	PRIMARY KEY(`project_id`, `email`)
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `partner_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `partner_confirmed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `community_handle` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `community_verified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `project_progress` ADD `approved_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `target_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `target_start` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `deadline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `hourly_rate` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `community_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE projects SET target_minutes=840, target_start='2026-11-11', deadline='2026-11-18', hourly_rate=500, rate='₹500 per QC-approved pair-hour · ₹250 each', requirements='Two permanent participants per pair. Both register and confirm their pairing. Flexible recording times. Weekly target: 14 shared recording hours; this assignment is due by 18 November 2026, end of day India time. One pair lead reports completed sections, shared recording minutes, client ID and permitted Drive evidence daily. Only client-QC-approved minutes qualify for payment at ₹500 per pair-hour (₹250 each). Payment timing follows client QC and vendor settlement. Join the approved project community and use mandatory invite code IMCIAD on the client platform.' WHERE id='speech-pair';
