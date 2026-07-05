# 001 — Architecture globale du module Wallet / UserPayment

## Objectif

Ce module permet de rémunérer les utilisateurs EDUKIA qui chargent des épreuves acceptées, puis de gérer les retraits Mobile Money manuels avant une future automatisation.

## Modules

- `WalletModule` : wallet, soldes, transactions, crédit après validation d’épreuve, demande de retrait.
- `UserPaymentModule` : comptes Mobile Money, configuration, validation admin, paiement manuel, preuve, audit.
- `shared` : ports, tokens, enums, Rules Engine.

## Architecture

```txt
controller
  -> use-case applicatif
    -> aggregate / rules
      -> port
        -> adapter TypeORM / module externe
```

Les contrôleurs ne contiennent aucune logique métier. Toute décision métier est portée par les use-cases, les aggregates et le Rules Engine.


## 7. Intégration Firebase FCM

Le port `PaymentNotificationPort` est maintenant résolu par `FirebaseFcmPaymentNotificationAdapter`.

Les use cases restent indépendants de Firebase : ils publient seulement une intention métier de notification. L'adaptateur infrastructure persiste l'évènement dans `payment_notifications`, récupère le `fcm_token` depuis `utilisateurs`, puis appelle le `FirebaseService` existant du projet.

Cette séparation permet de remplacer Firebase plus tard par un autre canal sans modifier les use cases `Wallet` ou `UserPayment`.
