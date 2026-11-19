CREATE TABLE hiring_preferences (
  user_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  interest TEXT NOT NULL CHECK(interest IN ('freelancer','vendor')),
  opted_in INTEGER NOT NULL CHECK(opted_in IN (0,1)),
  whatsapp TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '',
  CHECK((opted_in=0 AND whatsapp='') OR (opted_in=1 AND length(whatsapp) BETWEEN 9 AND 16))
);
CREATE INDEX hiring_audience ON hiring_preferences(opted_in,interest,user_id);
CREATE TABLE hiring_segments (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL UNIQUE COLLATE NOCASE,
  interest TEXT NOT NULL, city TEXT NOT NULL, language TEXT NOT NULL, device TEXT NOT NULL
);
