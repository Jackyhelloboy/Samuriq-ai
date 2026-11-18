CREATE TABLE project_recruitment (
  project_id TEXT PRIMARY KEY, languages TEXT NOT NULL DEFAULT '', devices TEXT NOT NULL DEFAULT '',
  group_url TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', revision TEXT NOT NULL
);
CREATE TABLE recruitment_reviews (user_id TEXT PRIMARY KEY, profile_version TEXT NOT NULL, reviewer TEXT NOT NULL, reviewed TEXT NOT NULL);
CREATE TABLE group_visits (project_id TEXT NOT NULL, user_id TEXT NOT NULL, opened TEXT NOT NULL, PRIMARY KEY(project_id,user_id));
CREATE TABLE email_challenges (email TEXT PRIMARY KEY, digest TEXT NOT NULL DEFAULT '', expires INTEGER NOT NULL DEFAULT 0, requested INTEGER NOT NULL);
CREATE TABLE verified_mailboxes (email TEXT PRIMARY KEY, verified INTEGER NOT NULL);
CREATE INDEX recruitment_email_queue ON email_challenges(requested);
ALTER TABLE payment_requests ADD COLUMN base_bank_version TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX pending_bank_change ON payment_requests(user_id) WHERE kind='bank-change' AND status='pending';
CREATE TRIGGER apply_reviewed_bank_change AFTER UPDATE OF status ON payment_requests
WHEN NEW.kind='bank-change' AND OLD.status='pending' AND NEW.status='approved'
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bank_details WHERE user_id=NEW.user_id AND updated=NEW.base_bank_version) THEN RAISE(ABORT,'Bank details changed since review') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM bank_claims WHERE fingerprint=NEW.fingerprint AND owner_id<>NEW.user_id) AND NOT EXISTS(SELECT 1 FROM family_grants WHERE user_id=NEW.user_id AND fingerprint=NEW.fingerprint) THEN RAISE(ABORT,'Shared account requires separate approval') END;
 INSERT OR IGNORE INTO bank_claims(fingerprint,owner_id,created) VALUES(NEW.fingerprint,NEW.user_id,NEW.reviewed);
 UPDATE bank_details SET encrypted=NEW.encrypted,fingerprint=NEW.fingerprint,last4=NEW.last4,updated=NEW.reviewed WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER reset_changed_group AFTER UPDATE OF group_url ON project_recruitment
WHEN NEW.group_url<>OLD.group_url BEGIN DELETE FROM group_visits WHERE project_id=NEW.project_id; END;
