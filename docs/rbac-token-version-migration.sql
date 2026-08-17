-- RBAC Batch 6 - immediate rights revocation
-- Apply after or with the permission profile migration.

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

UPDATE utilisateurs
SET token_version = 0
WHERE token_version IS NULL;
