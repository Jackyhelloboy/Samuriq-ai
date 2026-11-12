ALTER TABLE telegram_links ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX telegram_link_user_unique ON telegram_links(user_id) WHERE user_id <> '';
--> statement-breakpoint
CREATE TABLE telegram_link_codes (code_hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE INDEX telegram_code_user ON telegram_link_codes(user_id);
