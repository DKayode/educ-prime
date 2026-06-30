CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('REWARD','RELEASE','WITHDRAW','ADJUSTMENT')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  balance_before NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  available_balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  pending_balance_after NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING','COMPLETED','FAILED','CANCELLED')),
  created_by INTEGER NULL REFERENCES utilisateurs(id) ON DELETE SET NULL,
  metadata JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created_at ON wallet_transactions(wallet_id, created_at DESC);
