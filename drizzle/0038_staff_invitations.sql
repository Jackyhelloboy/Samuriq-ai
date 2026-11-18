ALTER TABLE participants ADD COLUMN mobile_os TEXT NOT NULL DEFAULT '';
ALTER TABLE participants ADD COLUMN os_version TEXT NOT NULL DEFAULT '';
ALTER TABLE participants ADD COLUMN skill_level TEXT NOT NULL DEFAULT '';
CREATE TABLE staff_ids(user_id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE DEFAULT (upper(hex(randomblob(8)))));
INSERT OR IGNORE INTO staff_ids(user_id) SELECT user_id FROM managers UNION SELECT leader_id FROM project_teams;
CREATE TRIGGER manager_reference AFTER INSERT ON managers BEGIN INSERT OR IGNORE INTO staff_ids(user_id) VALUES(NEW.user_id); END;
CREATE TRIGGER leader_reference AFTER INSERT ON project_teams BEGIN INSERT OR IGNORE INTO staff_ids(user_id) VALUES(NEW.leader_id); END;
CREATE TABLE staff_invites(id TEXT PRIMARY KEY,digest TEXT NOT NULL UNIQUE,recipient TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('manager','tl','helper')),scope TEXT NOT NULL,label TEXT NOT NULL,permissions TEXT NOT NULL,issuer TEXT NOT NULL,expires INTEGER NOT NULL,created TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',redeemed TEXT NOT NULL DEFAULT '');
CREATE INDEX staff_invite_history ON staff_invites(created);
CREATE TRIGGER apply_staff_invite AFTER UPDATE OF status ON staff_invites
WHEN OLD.status='pending' AND NEW.status='accepted' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM participants p JOIN accounts a ON a.id=p.id JOIN verified_mailboxes v ON v.email=lower(a.email) WHERE p.id=NEW.recipient AND p.suspended=0) THEN RAISE(ABORT,'Verified active profile required') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM managers WHERE user_id=NEW.recipient) THEN RAISE(ABORT,'Already a manager') END;
 SELECT CASE WHEN NEW.role='manager' AND EXISTS(SELECT 1 FROM project_teams WHERE leader_id=NEW.recipient) THEN RAISE(ABORT,'Review existing leadership first') END;
 INSERT INTO managers(user_id,granted_by,created) SELECT NEW.recipient,NEW.issuer,NEW.redeemed WHERE NEW.role='manager';
 SELECT CASE WHEN NEW.role='tl' AND (NOT EXISTS(SELECT 1 FROM projects j JOIN participants p ON p.id=NEW.recipient WHERE j.id=NEW.scope AND j.active=1 AND j.archived_at='' AND j.hourly_rate>0 AND p.phone_consent=1 AND p.phone<>'') OR (SELECT count(*) FROM project_teams t JOIN projects j ON j.id=t.project_id WHERE t.leader_id=NEW.recipient AND t.active=1 AND j.active=1)>=coalesce((SELECT max_projects FROM leader_policies WHERE user_id=NEW.recipient),1)) THEN RAISE(ABORT,'Review leadership eligibility or project rate') END;
 INSERT INTO project_teams(id,project_id,leader_id,label,code,rate_paise,approved_rate_paise,created_by,created)
 SELECT NEW.id,j.id,NEW.recipient,NEW.label,hex(randomblob(16)),j.hourly_rate*100/(1+j.pair),j.hourly_rate*100/(1+j.pair),NEW.issuer,NEW.redeemed FROM projects j WHERE NEW.role='tl' AND j.id=NEW.scope;
 INSERT INTO team_invites(id,team_id,code,expires_at,max_uses,created_by,created) SELECT hex(randomblob(16)),NEW.id,lower(hex(randomblob(16))),unixepoch(NEW.redeemed)*1000+604800000,50,NEW.recipient,NEW.redeemed WHERE NEW.role='tl';
 SELECT CASE WHEN NEW.role='helper' AND NOT EXISTS(SELECT 1 FROM team_members m JOIN project_teams t ON m.team_id=t.id WHERE t.id=NEW.scope AND t.active=1 AND m.user_id=NEW.recipient) THEN RAISE(ABORT,'Active team membership required') END;
 INSERT INTO team_helpers(team_id,user_id,scopes,granted_by,created) SELECT NEW.scope,NEW.recipient,NEW.permissions,NEW.issuer,NEW.redeemed WHERE NEW.role='helper';
 INSERT INTO operation_audit(id,actor,action,target,detail,created) VALUES(hex(randomblob(16)),NEW.recipient,'staff-invite-accepted',NEW.id,NEW.role,NEW.redeemed);
END;
CREATE TRIGGER refresh_profile_review AFTER UPDATE OF name,username,email,location,language,device,phone,mobile_os,os_version,skill_level,skills ON participants
WHEN NEW.name<>OLD.name OR NEW.username<>OLD.username OR NEW.email<>OLD.email OR NEW.location<>OLD.location OR NEW.language<>OLD.language OR NEW.device<>OLD.device OR NEW.phone<>OLD.phone OR NEW.mobile_os<>OLD.mobile_os OR NEW.os_version<>OLD.os_version OR NEW.skill_level<>OLD.skill_level OR NEW.skills<>OLD.skills
BEGIN DELETE FROM recruitment_reviews WHERE user_id=NEW.id; END;
CREATE TABLE team_group_links(team_id TEXT PRIMARY KEY,url TEXT NOT NULL);
CREATE TRIGGER reset_team_group_visits AFTER INSERT ON team_group_links BEGIN
 DELETE FROM group_visits WHERE (project_id,user_id) IN (SELECT project_id,user_id FROM team_members WHERE team_id=NEW.team_id);
END;
CREATE TRIGGER update_team_group_visits AFTER UPDATE OF url ON team_group_links WHEN NEW.url<>OLD.url BEGIN
 DELETE FROM group_visits WHERE (project_id,user_id) IN (SELECT project_id,user_id FROM team_members WHERE team_id=NEW.team_id);
END;
CREATE TRIGGER moved_member_group_visits AFTER UPDATE OF team_id ON team_members WHEN OLD.team_id<>NEW.team_id BEGIN
 DELETE FROM group_visits WHERE project_id=NEW.project_id AND user_id=NEW.user_id;
END;
