export enum Permission {
  ADMIN_DASHBOARD_READ = 'admin.dashboard.read',

  USERS_READ = 'users.read',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DELETE = 'users.delete',
  USERS_MANAGE_ROLES = 'users.manage_roles',

  REFERENTIALS_READ = 'referentials.read',
  REFERENTIALS_CREATE = 'referentials.create',
  REFERENTIALS_UPDATE = 'referentials.update',
  REFERENTIALS_DELETE = 'referentials.delete',

  EPREUVES_READ = 'epreuves.read',
  EPREUVES_CREATE = 'epreuves.create',
  EPREUVES_UPDATE = 'epreuves.update',
  EPREUVES_DELETE = 'epreuves.delete',
  EPREUVES_VALIDATE = 'epreuves.validate',

  EXAMENS_NATIONAUX_READ = 'examens_nationaux.read',
  EXAMENS_NATIONAUX_CREATE = 'examens_nationaux.create',
  EXAMENS_NATIONAUX_UPDATE = 'examens_nationaux.update',
  EXAMENS_NATIONAUX_DELETE = 'examens_nationaux.delete',
  EXAMENS_NATIONAUX_VALIDATE = 'examens_nationaux.validate',

  CONCOURS_READ = 'concours.read',
  CONCOURS_CREATE = 'concours.create',
  CONCOURS_UPDATE = 'concours.update',
  CONCOURS_DELETE = 'concours.delete',
  CONCOURS_VALIDATE = 'concours.validate',

  WALLET_READ = 'wallet.read',
  WALLET_WITHDRAWALS_READ = 'wallet.withdrawals.read',
  WALLET_WITHDRAWALS_APPROVE = 'wallet.withdrawals.approve',
  WALLET_WITHDRAWALS_REJECT = 'wallet.withdrawals.reject',
  WALLET_WITHDRAWALS_CANCEL = 'wallet.withdrawals.cancel',
  WALLET_WITHDRAWALS_UNLOCK_OTP = 'wallet.withdrawals.unlock_otp',
  WALLET_WITHDRAWALS_CONFIRM_PAYMENT = 'wallet.withdrawals.confirm_payment',
  WALLET_CONFIGURATION_UPDATE = 'wallet.configuration.update',

  NOTIFICATIONS_READ = 'notifications.read',
  NOTIFICATIONS_SEND = 'notifications.send',
  NOTIFICATIONS_CANCEL = 'notifications.cancel',

  STATS_READ = 'stats.read',

  AUTHORIZATION_MANAGE = 'authorization.manage',
}