-- L3: attempt ids are client-chosen, so they must be unique per profile, not globally.
-- With a global key, family B could push an id already used by family A: the row was silently
-- dropped (silencing B's own data) and the behaviour revealed that the id existed elsewhere.
-- SQLite cannot change a primary key in place: rebuild the table (runs inside the migration transaction).
CREATE TABLE attempts_new (
  id TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (profile_id, id)
);
INSERT INTO attempts_new (id, profile_id, data, created_at, seq)
  SELECT id, profile_id, data, created_at, seq FROM attempts;
DROP TABLE attempts;
ALTER TABLE attempts_new RENAME TO attempts;
CREATE INDEX idx_attempts_profile_seq ON attempts(profile_id, seq);
