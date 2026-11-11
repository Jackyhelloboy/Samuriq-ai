CREATE TABLE `applications` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`partner` text NOT NULL,
	`experience` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`requirements` text NOT NULL,
	`client_url` text NOT NULL,
	`invite_code` text NOT NULL,
	`pair` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);

--> statement-breakpoint
INSERT INTO projects (id,title,category,description,requirements,client_url,invite_code,pair,active,created) VALUES ('speech-pair','Healthcare conversation recording','Speech & audio','Record scripted healthcare conversations with a partner. Register your interest and wait for project approval before starting.','Two consenting participants. Hindi or Telugu. Quiet recording environment and smartphone. Confirm current rate, QC and payment timeline with the coordinator before starting.','https://webrtcsg.shenfei-rec.com/?redirect=/index','IMCIAD',1,1,'2026-11-10T00:00:00Z');
