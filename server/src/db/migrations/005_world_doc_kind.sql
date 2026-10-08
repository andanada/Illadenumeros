-- The town ("El Poble dels Números") adds one doc per profile: kind 'world', key 'world'.
-- SQLite cannot change a CHECK constraint in place: rebuild the table (runs inside the migration transaction).
CREATE TABLE docs_new (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('skill', 'fact', 'rewards', 'settings', 'world')),
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (profile_id, kind, key)
);
INSERT INTO docs_new (profile_id, kind, key, data, updated_at, seq)
  SELECT profile_id, kind, key, data, updated_at, seq FROM docs;
DROP TABLE docs;
ALTER TABLE docs_new RENAME TO docs;
CREATE INDEX idx_docs_profile_seq ON docs(profile_id, seq);
