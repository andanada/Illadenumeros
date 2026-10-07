CREATE TABLE families (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  deleted_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent_hash TEXT
);
CREATE INDEX idx_sessions_family ON sessions(family_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  character TEXT,
  color TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_profiles_family ON profiles(family_id);

-- Single counter row: every write to docs/attempts takes the next value (monotonic per database).
CREATE TABLE seq_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL
);
INSERT INTO seq_counter (id, value) VALUES (1, 0);

CREATE TABLE docs (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('skill', 'fact', 'rewards', 'settings')),
  key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  PRIMARY KEY (profile_id, kind, key)
);
CREATE INDEX idx_docs_profile_seq ON docs(profile_id, seq);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  seq INTEGER NOT NULL
);
CREATE INDEX idx_attempts_profile_seq ON attempts(profile_id, seq);

CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT,
  event TEXT NOT NULL,
  at INTEGER NOT NULL,
  ip_hash TEXT
);
CREATE INDEX idx_audit_at ON audit(at);
CREATE INDEX idx_audit_family ON audit(family_id);
