-- Data minimisation: neither column was ever read (sessions.user_agent_hash was written but unused;
-- families are always hard-deleted, so families.deleted_at stayed NULL).
ALTER TABLE sessions DROP COLUMN user_agent_hash;
ALTER TABLE families DROP COLUMN deleted_at;
