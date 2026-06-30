CREATE TABLE IF NOT EXISTS payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(150) NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PROCESSING','COMPLETED','CANCELLED')),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE payment_executions
  ADD CONSTRAINT fk_payment_execution_batch
  FOREIGN KEY (batch_id) REFERENCES payment_batches(id) ON DELETE SET NULL;
