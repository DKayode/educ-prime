CREATE TABLE IF NOT EXISTS user_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  operator VARCHAR(30) NOT NULL CHECK (operator IN ('MTN_MOMO','MOOV_MONEY','CELTIIS_CASH')),
  phone_number VARCHAR(30) NOT NULL,
  CONSTRAINT chk_user_payment_accounts_benin_phone CHECK (regexp_replace(phone_number, '[[:space:].-]', '', 'g') ~ '^\+22901[0-9]{8}$'),
  account_name VARCHAR(150) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_payment_default_account ON user_payment_accounts(user_id) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_payment_accounts_user ON user_payment_accounts(user_id);
