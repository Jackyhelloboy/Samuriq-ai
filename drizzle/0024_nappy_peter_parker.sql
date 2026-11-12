CREATE TABLE `payout_items` (
	`earning_id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payout_item_order` ON `payout_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `earning_user_day` ON `earnings` (`user_id`,`day`);
--> statement-breakpoint
INSERT OR IGNORE INTO payout_items (earning_id,order_id) SELECT e.id,o.id FROM payout_orders o JOIN earnings e ON e.id=o.earning_id;
