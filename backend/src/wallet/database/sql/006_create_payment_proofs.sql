CREATE TABLE IF NOT EXISTS payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_execution_id UUID NOT NULL REFERENCES payment_executions(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
