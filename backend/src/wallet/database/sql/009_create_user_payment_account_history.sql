CREATE TABLE IF NOT EXISTS user_payment_account_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  old_phone_number VARCHAR(30) NULL,
  new_phone_number VARCHAR(30) NOT NULL,
  old_operator VARCHAR(30) NULL,
  new_operator VARCHAR(30) NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
