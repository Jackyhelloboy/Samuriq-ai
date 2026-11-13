ALTER TABLE participants ADD COLUMN primary_project_id TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN telegram_required INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN tutorial_reference INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN sample INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE telegram_links ADD COLUMN username TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TRIGGER telegram_chat_insert BEFORE INSERT ON telegram_links
WHEN NEW.user_id<>'' AND EXISTS(SELECT 1 FROM telegram_links WHERE chat_id=NEW.chat_id AND user_id<>'' AND user_id<>NEW.user_id)
BEGIN SELECT RAISE(ABORT,'telegram_account_in_use'); END;
--> statement-breakpoint
CREATE TRIGGER telegram_chat_update BEFORE UPDATE OF chat_id,user_id ON telegram_links
WHEN NEW.user_id<>'' AND EXISTS(SELECT 1 FROM telegram_links WHERE chat_id=NEW.chat_id AND user_id<>'' AND user_id<>NEW.user_id AND handle<>OLD.handle)
BEGIN SELECT RAISE(ABORT,'telegram_account_in_use'); END;
--> statement-breakpoint
UPDATE projects SET active=0 WHERE id<>'speech-pair';
--> statement-breakpoint
UPDATE projects SET active=1,visibility='listed',telegram_required=1,tutorial_reference=1,tutorial_url='https://drive.google.com/file/d/1-3M8fVkwz0uuFKnknMTH_CnxrMkL4QDX/view?usp=sharing',onboarding_required=1 WHERE id='speech-pair';
--> statement-breakpoint
INSERT OR IGNORE INTO projects(id,title,category,description,requirements,client_url,invite_code,rate,location,pair,active,created,visibility,sample,work_type) VALUES
('sample-3d-hands','3D hand annotation','3D hand labeling','Sample project showing how 3D hand annotation opportunities will appear. This is not a live vacancy.','Sample brief only. Applications and client access are closed.','','','Not offered','Remote',0,0,'2026-11-12T00:00:00Z','listed',1,'annotation'),
('sample-pov','Everyday motion capture','Human motion & POV','Sample project for first-person activity data collection. This is not a live client assignment.','Sample brief only. No uploads or registrations accepted.','','','Not offered','Remote',0,0,'2026-11-11T00:00:00Z','listed',1,'motion'),
('sample-video','Video scene labeling','Video labeling','Sample project demonstrating a video labeling workflow. This is not an active opening.','Sample brief only. Registration remains closed.','','','Not offered','Remote',0,0,'2026-11-10T00:00:00Z','listed',1,'annotation');
