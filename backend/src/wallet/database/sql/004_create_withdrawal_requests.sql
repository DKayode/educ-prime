CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  fees NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  net_amount NUMERIC(14,2) NOT NULL CHECK (net_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','PROCESSING','PAID','FAILED','REJECTED','CANCELLED')),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'MOBILE_MONEY' CHECK (payment_method IN ('MOBILE_MONEY')),
  payment_account_id UUID NULL,
  approved_by INTEGER NULL REFERENCES utilisateurs(id) ON DELETE SET NULL,
  approved_at TIMESTAMP NULL,
  rejected_by INTEGER NULL REFERENCES utilisateurs(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP NULL,
  rejected_reason TEXT NULL,
  payment_deadline TIMESTAMP NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_wallet_status ON withdrawal_requests(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);
