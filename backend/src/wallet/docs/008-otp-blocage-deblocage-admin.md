# 013 — Politique OTP configurable et déblocage administrateur

## Objectif

Cette évolution renforce la sécurité des demandes de retrait. Lorsqu’un utilisateur échoue trop de fois à la vérification OTP, sa demande ne reste pas simplement en attente : elle passe en vérification de sécurité administrateur.

## Nouveaux statuts

Le statut de retrait peut maintenant prendre les valeurs suivantes :

- `OTP_PENDING` : OTP envoyé, validation utilisateur attendue ;
- `PENDING` : OTP validé, demande soumise à l’administration ;
- `SECURITY_REVIEW_REQUIRED` : nombre maximal de tentatives OTP atteint, vérification admin obligatoire ;
- `APPROVED`, `PROCESSING`, `PAID`, `FAILED`, `REJECTED`, `CANCELLED`.

## Configuration administrateur

La route existante permet maintenant de configurer la politique OTP :

```http
PATCH /user-payment/admin/configuration
```

Exemple de body :

```json
{
  "otpEnabled": true,
  "otpLength": 6,
  "otpTtlMinutes": 10,
  "otpMaxAttempts": 3,
  "otpResendCooldownSeconds": 60,
  "otpMaxResends": 2,
  "otpLockDurationMinutes": 1440,
  "otpRequireAdminUnlock": true,
  "otpAutoUnlockEnabled": false,
  "otpBlockWithdrawalCreation": true,
  "otpProvider": "infobip"
}
```

## Déblocage administrateur

Nouvelle route :

```http
PATCH /user-payment/admin/withdrawals/:id/unlock-otp
```

Body :

```json
{
  "reason": "Identité vérifiée par appel téléphonique et cohérence du compte Mobile Money confirmée.",
  "verificationMethod": "PHONE_CALL",
  "allowNewOtp": true
}
```

Effets :

1. vérifie que la demande est bien en `SECURITY_REVIEW_REQUIRED` ;
2. journalise le déblocage dans l’audit ;
3. expire les anciens OTP actifs ;
4. remet la demande en `OTP_PENDING` ;
5. génère et envoie un nouvel OTP si `allowNewOtp=true` ;
6. notifie l’utilisateur.

## Sécurité

Le code OTP reste stocké sous forme de hash. Le champ `debugCode` reste uniquement destiné aux environnements de développement et n’est renseigné que si `OTP_DEBUG_ENABLED=true` et `NODE_ENV !== production`.
