# 008 — Notifications mobiles Firebase FCM

## 1. Objectif

Cette évolution branche le module `Payment/Wallet` sur le module Firebase existant du backend EDUKIA afin d'envoyer les notifications mobiles aux utilisateurs via leur `fcm_token`.

Le champ `fcm_token` est porté par la table `utilisateurs`. Le module utilisateurs fourni expose déjà l'endpoint :

```http
PATCH /utilisateurs/me/update/fcm-token
```

Le mobile doit appeler cet endpoint après connexion, au lancement de l'application ou après renouvellement du token Firebase.

## 2. Principe d'architecture

L'architecture hexagonale est conservée :

- les use cases continuent d'appeler uniquement le port `PaymentNotificationPort` ;
- les contrôleurs ne connaissent pas Firebase ;
- l'adaptateur `FirebaseFcmPaymentNotificationAdapter` gère l'infrastructure ;
- chaque notification est d'abord enregistrée dans `payment_notifications`, puis envoyée via `FirebaseService.sendToTokens()`.

Fichier principal :

```txt
src/payment/infrastructure/firebase-fcm-payment-notification.adapter.ts
```

## 3. Évènements déclencheurs

L'envoi FCM est exécuté automatiquement sur les évènements suivants :

1. crédit du wallet après validation d'une épreuve ;
2. création d'une demande de retrait par l'utilisateur ;
3. alerte administrateur à chaque nouvelle demande de retrait ;
4. confirmation du paiement manuel Mobile Money par l'administrateur ;
5. tout autre use case appelant `PaymentNotificationPort`.

## 4. Notification utilisateur

Pour une notification utilisateur, l'adaptateur :

1. crée une ligne dans `payment_notifications` ;
2. récupère `utilisateurs.fcm_token` ;
3. ignore proprement l'envoi si le token est absent ;
4. appelle `FirebaseService.sendToTokens({ tokens, payload })` ;
5. met à jour le statut FCM : `SENT`, `FAILED`, `SKIPPED` ou `PARTIAL_FAILED`.

## 5. Notification administrateur

Pour une notification administrateur, l'adaptateur récupère tous les utilisateurs actifs dont :

```sql
role = 'admin'
est_desactive = false
fcm_token IS NOT NULL
```

Puis il envoie une notification multicast par lots, via la logique déjà prévue dans `FirebaseService`.

## 6. Statuts FCM conservés

La table `payment_notifications` conserve maintenant les informations suivantes :

- `fcm_status` ;
- `fcm_message_id` ;
- `fcm_success_count` ;
- `fcm_failure_count` ;
- `fcm_failure_reason` ;
- `fcm_sent_at`.

Cela évite de perdre la trace des échecs Firebase, surtout dans les paiements où la preuve et la notification utilisateur sont sensibles.

## 7. Point important sur FirebaseService

Le module Firebase fourni possède déjà `sendToTokens()`. Pour que l'application mobile puisse exploiter les métadonnées de navigation, la configuration de base du message doit transmettre aussi `data`.

Dans `src/firebase/firebase.service.ts`, dans `createBaseMessageConfig(payload)`, vérifier que cette ligne est active :

```ts
data: this.stringifyData(payload.data),
```

Dans le fichier Firebase transmis, cette ligne est commentée. Sans elle, la notification push partira bien avec `title` et `body`, mais l'application mobile ne recevra pas les données comme `withdrawalRequestId`, `paymentExecutionId`, `proofUrl`, `notificationType`, etc.

## 8. Migration SQL

Appliquer la migration :

```txt
database/sql/014_add_fcm_notification_support.sql
```

Elle ajoute les colonnes FCM aux notifications et sécurise la présence du champ `fcm_token` sur `utilisateurs`.
