-- Preserve existing accounts; atomically prevent new email collisions.
CREATE TRIGGER accounts_unique_email_insert BEFORE INSERT ON accounts
WHEN EXISTS(SELECT 1 FROM accounts WHERE lower(email)=lower(NEW.email) AND id<>NEW.id)
BEGIN SELECT RAISE(ABORT,'account_email_in_use'); END;
--> statement-breakpoint
CREATE TRIGGER accounts_unique_email_update BEFORE UPDATE OF email ON accounts
WHEN EXISTS(SELECT 1 FROM accounts WHERE lower(email)=lower(NEW.email) AND id<>NEW.id)
BEGIN SELECT RAISE(ABORT,'account_email_in_use'); END;
