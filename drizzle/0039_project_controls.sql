ALTER TABLE project_teams ADD COLUMN post_editor TEXT NOT NULL DEFAULT '';
INSERT INTO policy_versions(id,body,duties,published_by,created)
SELECT 'project-nda-v1', 'Project non-disclosure agreement' || char(10,10) ||
'I agree to use private project instructions, client materials, recordings, credentials, group invitations and participant details only for my assigned work. I will share them only with authorized project members through approved channels. I will report accidental disclosures promptly through Support and return or delete private copies when my assignment ends. This commitment continues while the information remains confidential. It excludes information already public, lawfully obtained independently, or required to be disclosed by law.' || char(10,10) || body,
duties,'system:project-nda',CURRENT_TIMESTAMP FROM policy_versions WHERE id=(SELECT version_id FROM current_policy WHERE id='platform');
UPDATE current_policy SET version_id='project-nda-v1' WHERE id='platform' AND EXISTS (SELECT 1 FROM policy_versions WHERE id='project-nda-v1');
