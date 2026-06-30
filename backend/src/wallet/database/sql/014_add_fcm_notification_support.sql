-- Migration complémentaire pour les bases déjà installées avant l'intégration FCM.
-- Le champ fcm_token existe déjà dans le module utilisateurs fourni, mais cette migration le sécurise.
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS fcm_token TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_utilisateurs_fcm_token_not_null
  ON utilisateurs(id)
  WHERE fcm_token IS NOT NULL AND NULLIF(TRIM(fcm_token), '') IS NOT NULL;

ALTER TABLE payment_notifications ADD COLUMN IF NOT EXISTS fcm_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE payment_notifications ADD COLUMN IF NOT EXISTS fcm_message_id VARCHAR(255) NULL;
ALTER TABLE payment_notifications ADD COLUMN IF NOT EXISTS fcm_success_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_notifications ADD COLUMN IF NOT EXISTS fcm_failure_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payment_notifications ADD COLUMN IF NOT EXISTS fcm_failure_reason TEXT NULL;
ALTER TABLE payment_notifications ADD COLUMN IF NOT EXISTS fcm_sent_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_payment_notifications_fcm_status ON payment_notifications(fcm_status);
