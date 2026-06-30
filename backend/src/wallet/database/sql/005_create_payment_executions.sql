CREATE TABLE IF NOT EXISTS payment_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  executed_by INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'MOBILE_MONEY' CHECK (payment_method IN ('MOBILE_MONEY')),
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('MTN_MOMO','MOOV_MONEY','CELTIIS_CASH')),
  transaction_reference VARCHAR(150) NOT NULL UNIQUE,
  phone_number VARCHAR(30) NOT NULL,
  CONSTRAINT chk_payment_executions_benin_phone CHECK (regexp_replace(phone_number, '[[:space:].-]', '', 'g') ~ '^\+22901[0-9]{8}$'),
  paid_amount NUMERIC(14,2) NOT NULL CHECK (paid_amount > 0),
  comment TEXT NULL,
  internal_note TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING','COMPLETED','FAILED','CANCELLED')),
  paid_at TIMESTAMP NOT NULL,
  batch_id UUID NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_executions_withdrawal ON payment_executions(withdrawal_request_id);
