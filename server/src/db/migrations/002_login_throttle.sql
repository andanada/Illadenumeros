-- Failed-login counters keyed by a salted hash of IP + email (no raw identifiers stored).
CREATE TABLE login_throttle (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_login_throttle_updated ON login_throttle(updated_at);
