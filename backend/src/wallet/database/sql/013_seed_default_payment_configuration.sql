INSERT INTO payment_configurations (
  minimum_withdrawal, maximum_withdrawal, withdraw_fee, withdraw_fee_type,
  reward_per_exam, currency, wallet_enabled, withdraw_enabled, reward_enabled,
  review_delay_hours, daily_withdrawal_limit, monthly_withdrawal_limit,
  kyc_threshold, minimum_wallet_balance, max_withdraw_per_day,
  max_withdraw_per_week, max_withdraw_per_month, automatic_withdrawal,
  maintenance_mode, is_active
) VALUES (
  500, 50000, 0, 'FIXED',
  100, 'XOF', TRUE, TRUE, TRUE,
  0, 100000, 500000,
  0, 0, 1,
  3, 10, FALSE,
  FALSE, TRUE
)
ON CONFLICT DO NOTHING;
