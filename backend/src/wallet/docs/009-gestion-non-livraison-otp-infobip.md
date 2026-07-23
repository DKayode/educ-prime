# 015 - Gestion sécurisée des OTP non livrés par Infobip

## Objectif

Cette mise à jour évite de considérer qu’un OTP est réellement reçu par l’utilisateur dès que l’API Infobip accepte la requête d’envoi. Le système distingue :

- l’acceptation technique par Infobip ;
- la livraison réelle au téléphone ;
- l’échec de livraison ;
- l’absence de retour de livraison dans les délais.

## Nouveaux statuts de livraison

Le champ `deliveryStatus` de `withdrawal_otps` peut prendre les valeurs suivantes :

- `NOT_REQUIRED` : provider console ou suivi non nécessaire ;
- `CREATED` : OTP généré avant envoi ;
- `SENT_TO_PROVIDER` : Infobip a accepté la demande d’envoi ;
- `DELIVERED` : Infobip confirme la livraison au téléphone ;
- `UNDELIVERED` : Infobip confirme que le SMS n’a pas été livré ;
- `FAILED` : l’appel d’envoi a échoué ;
- `DELIVERY_UNKNOWN` : le statut reste incertain ;
- `DELIVERY_TIMEOUT` : aucune confirmation après le délai maximal.

## Webhook Infobip

Route ajoutée :

```http
POST /internal/otp/infobip/delivery-report
```

Sécurité :

```http
x-infobip-webhook-secret: <INFOBIP_WEBHOOK_SECRET>
```

ou :

```http
POST /internal/otp/infobip/delivery-report?secret=<INFOBIP_WEBHOOK_SECRET>
```

Cette route met à jour l’OTP grâce au `messageId` retourné par Infobip.

## Renvoi sécurisé OTP

Route ajoutée :

```http
POST /wallet/withdrawals/:id/resend-otp
```

Règles appliquées :

- la demande doit être en `OTP_PENDING` ;
- l’utilisateur doit être propriétaire du wallet ;
- l’ancien OTP est expiré ;
- le nombre maximal de renvois est contrôlé ;
- le cooldown de renvoi est appliqué ;
- après trop de renvois, la demande passe en `SECURITY_REVIEW_REQUIRED`.

## Polling de secours

Le service `InfobipDeliveryPollingService` vérifie périodiquement les OTP Infobip restés en statut incertain. Il utilise :

```env
OTP_DELIVERY_POLLING_ENABLED=true
OTP_DELIVERY_MAX_CHECKS=5
OTP_DELIVERY_TIMEOUT_SECONDS=300
INFOBIP_REPORTS_ENDPOINT=/sms/1/reports
```

## Variables `.env` ajoutées

```env
OTP_DELIVERY_TRACKING_ENABLED=true
OTP_DELIVERY_UNKNOWN_AFTER_SECONDS=120
OTP_DELIVERY_TIMEOUT_SECONDS=300
OTP_DELIVERY_POLLING_ENABLED=true
OTP_DELIVERY_POLLING_INTERVAL_MS=60000
OTP_DELIVERY_MAX_CHECKS=5
INFOBIP_WEBHOOK_SECRET=change-me-infobip-webhook-secret
INFOBIP_DELIVERY_REPORT_NOTIFY_URL=
INFOBIP_NOTIFY_CONTENT_TYPE=application/json
INFOBIP_REPORTS_ENDPOINT=/sms/1/reports
```

## Règle de sécurité importante

Même si le SMS n’est pas livré, le code OTP ne doit pas être communiqué par l’admin en production. La route debug reste réservée au développement avec :

```env
OTP_DEBUG_ENABLED=true
NODE_ENV=development
```

En production :

```env
OTP_DEBUG_ENABLED=false
NODE_ENV=production
```
