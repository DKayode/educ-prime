CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id INTEGER NULL REFERENCES utilisateurs(id) ON DELETE SET NULL,
  action VARCHAR(150) NOT NULL,
  entity VARCHAR(120) NOT NULL,
  entity_id VARCHAR(150) NULL,
  old_value JSONB NULL,
  new_value JSONB NULL,
  ip VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_entity ON payment_audit_logs(entity, entity_id);
