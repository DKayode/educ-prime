# 006 — Tests

## Tests générés

- `credit-wallet-from-validated-exam.use-case.spec.ts`
- `request-withdrawal.use-case.spec.ts`
- `confirm-manual-payment.use-case.spec.ts`
- `wallet-flow.integration-spec.ts`

## Commandes

```bash
npm run test
npm run test:cov
```

## À compléter en projet réel

- tests e2e avec `supertest` ;
- tests de guards admin ;
- tests de concurrence DB ;
- test de double référence `EXAM_REWARD:{examId}` ;
- test de double confirmation de paiement.

## Tests FCM ajoutés

Le fichier suivant couvre l'adaptateur Firebase :

```txt
test/payment/firebase-fcm-payment-notification.adapter.spec.ts
```

Cas testés :

1. notification envoyée à un utilisateur ayant un `fcm_token` ;
2. notification ignorée proprement si le token est absent ;
3. alerte multicast envoyée aux administrateurs actifs.

## Tests téléphone Bénin ajoutés

Les fichiers suivants couvrent le format Mobile Money Bénin `+229 01XXXXXXXX` :

```txt
test/payment/benin-phone-number.util.spec.ts
test/payment/upsert-payment-account.use-case.spec.ts
test/payment/request-withdrawal.use-case.spec.ts
test/payment/confirm-manual-payment.use-case.spec.ts
```

Cas testés :

1. acceptation et normalisation du format `+229 01XXXXXXXX` ;
2. rejet de l'ancien format `+229XXXXXXXX` sans préfixe `01` ;
3. rejet des numéros sans indicatif international `+229` ;
4. blocage de l'enregistrement du compte Mobile Money invalide ;
5. blocage de la demande de retrait si le compte par défaut porte un numéro invalide ;
6. blocage de la confirmation admin si le numéro payé n'est pas conforme.
