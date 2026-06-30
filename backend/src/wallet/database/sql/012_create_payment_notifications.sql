CREATE TABLE IF NOT EXISTS payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(60) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  for_admins BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NULL,
  fcm_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SENT',
  fcm_message_id VARCHAR(255) NULL,
  fcm_success_count INTEGER NOT NULL DEFAULT 0,
  fcm_failure_count INTEGER NOT NULL DEFAULT 0,
  fcm_failure_reason TEXT NULL,
  fcm_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_user_read ON payment_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_admins ON payment_notifications(for_admins, is_read);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_fcm_status ON payment_notifications(fcm_status);
