-- Validation du format Mobile Money Bénin : +229 01XXXXXXXX
-- Les espaces, points et tirets sont tolérés à la saisie mais le format compact doit rester +22901 + 8 chiffres.

ALTER TABLE user_payment_accounts
  DROP CONSTRAINT IF EXISTS chk_user_payment_accounts_benin_phone;

ALTER TABLE user_payment_accounts
  ADD CONSTRAINT chk_user_payment_accounts_benin_phone
  CHECK (regexp_replace(phone_number, '[[:space:].-]', '', 'g') ~ '^\+22901[0-9]{8}$') NOT VALID;

ALTER TABLE payment_executions
  DROP CONSTRAINT IF EXISTS chk_payment_executions_benin_phone;

ALTER TABLE payment_executions
  ADD CONSTRAINT chk_payment_executions_benin_phone
  CHECK (regexp_replace(phone_number, '[[:space:].-]', '', 'g') ~ '^\+22901[0-9]{8}$') NOT VALID;
