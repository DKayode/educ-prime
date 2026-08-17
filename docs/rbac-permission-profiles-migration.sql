-- RBAC Batch 5 - persistent permission profiles
-- Apply this in edukia-db before relying on dynamic profile assignments in production.
-- The backend keeps a runtime fallback to ROLE_PERMISSIONS if these tables are not present yet.

CREATE TABLE IF NOT EXISTS permission_profiles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  description TEXT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permission_profile_permissions (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES permission_profiles(id) ON DELETE CASCADE,
  permission VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT uq_permission_profile_permissions_profile_permission UNIQUE (profile_id, permission)
);

CREATE TABLE IF NOT EXISTS user_permission_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES permission_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_permission_profiles_user_profile UNIQUE (user_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_permission_profile_permissions_profile_id
  ON permission_profile_permissions(profile_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_profiles_user_id
  ON user_permission_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_profiles_profile_id
  ON user_permission_profiles(profile_id);

-- Optional seed profiles. Keep roles stable; organizational functions live here.
INSERT INTO permission_profiles (code, label, description, is_system)
VALUES
  ('directrice', 'Directrice', 'Profil metier pour la supervision et les actions sensibles deleguees.', true),
  ('finance', 'Finance', 'Profil metier pour la consultation et le traitement wallet.', true),
  ('validation_contenu', 'Validation contenu', 'Profil metier pour valider les epreuves, examens nationaux et concours.', true),
  ('etudiant_base', 'Etudiant base', 'Permissions de base heritees par les comptes etudiants.', true),
  ('professeur_base', 'Professeur base', 'Permissions de base heritees par les comptes professeurs.', true),
  ('admin_complet', 'Admin complet', 'Reference lisible du profil administrateur complet. Les admins gardent toutes les permissions par role.', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_profile_permissions (profile_id, permission)
SELECT p.id, seed.permission
FROM permission_profiles p
JOIN (VALUES
  ('directrice', 'users.read'),
  ('directrice', 'stats.read'),
  ('directrice', 'notifications.read'),
  ('directrice', 'notifications.send'),
  ('directrice', 'referentials.read'),
  ('finance', 'wallet.read'),
  ('finance', 'wallet.withdrawals.read'),
  ('finance', 'wallet.withdrawals.approve'),
  ('finance', 'wallet.withdrawals.reject'),
  ('finance', 'wallet.withdrawals.confirm_payment'),
  ('validation_contenu', 'epreuves.read'),
  ('validation_contenu', 'epreuves.validate'),
  ('validation_contenu', 'examens_nationaux.read'),
  ('validation_contenu', 'examens_nationaux.validate'),
  ('validation_contenu', 'concours.read'),
  ('validation_contenu', 'concours.validate'),
  ('etudiant_base', 'epreuves.read'),
  ('etudiant_base', 'examens_nationaux.read'),
  ('etudiant_base', 'concours.read'),
  ('etudiant_base', 'referentials.read'),
  ('professeur_base', 'epreuves.read'),
  ('professeur_base', 'epreuves.create'),
  ('professeur_base', 'epreuves.update'),
  ('professeur_base', 'examens_nationaux.read'),
  ('professeur_base', 'concours.read'),
  ('professeur_base', 'referentials.read'),
  ('admin_complet', 'admin.dashboard.read'),
  ('admin_complet', 'users.read'),
  ('admin_complet', 'users.create'),
  ('admin_complet', 'users.update'),
  ('admin_complet', 'users.delete'),
  ('admin_complet', 'users.manage_roles'),
  ('admin_complet', 'referentials.read'),
  ('admin_complet', 'referentials.create'),
  ('admin_complet', 'referentials.update'),
  ('admin_complet', 'referentials.delete'),
  ('admin_complet', 'epreuves.read'),
  ('admin_complet', 'epreuves.create'),
  ('admin_complet', 'epreuves.update'),
  ('admin_complet', 'epreuves.delete'),
  ('admin_complet', 'epreuves.validate'),
  ('admin_complet', 'examens_nationaux.read'),
  ('admin_complet', 'examens_nationaux.create'),
  ('admin_complet', 'examens_nationaux.update'),
  ('admin_complet', 'examens_nationaux.delete'),
  ('admin_complet', 'examens_nationaux.validate'),
  ('admin_complet', 'concours.read'),
  ('admin_complet', 'concours.create'),
  ('admin_complet', 'concours.update'),
  ('admin_complet', 'concours.delete'),
  ('admin_complet', 'concours.validate'),
  ('admin_complet', 'wallet.read'),
  ('admin_complet', 'wallet.withdrawals.read'),
  ('admin_complet', 'wallet.withdrawals.approve'),
  ('admin_complet', 'wallet.withdrawals.reject'),
  ('admin_complet', 'wallet.withdrawals.cancel'),
  ('admin_complet', 'wallet.withdrawals.unlock_otp'),
  ('admin_complet', 'wallet.withdrawals.confirm_payment'),
  ('admin_complet', 'wallet.configuration.update'),
  ('admin_complet', 'notifications.read'),
  ('admin_complet', 'notifications.send'),
  ('admin_complet', 'notifications.cancel'),
  ('admin_complet', 'stats.read'),
  ('admin_complet', 'authorization.manage')
) AS seed(code, permission) ON seed.code = p.code
ON CONFLICT (profile_id, permission) DO NOTHING;
