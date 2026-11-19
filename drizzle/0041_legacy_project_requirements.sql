-- Populate the original published brief only when no editable recruitment record exists.
INSERT OR IGNORE INTO project_recruitment (project_id,languages,devices,revision)
SELECT id,'Hindi','Android phone, Laptop / desktop',strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM projects WHERE id='speech-pair' AND requirements LIKE '%Hindi fluency%'
AND requirements LIKE '%Laptop or Android mobile%';
