# 002 — WalletModule

## Responsabilités

1. Créer automatiquement le wallet.
2. Créditer le wallet après validation d’épreuve.
3. Permettre la consultation du solde en temps réel.
4. Créer une demande de retrait.
5. Exécuter les règles métier de retrait.

## Endpoints

```txt
GET  /wallet/me
POST /wallet/withdrawals
```

## Crédit après validation d’épreuve

Le module épreuves doit envoyer :

```ts
{
  userId: number;
  examId: string;
  amount?: number;
  currency?: 'XOF';
  reference?: string;
  description?: string;
}
```

Si `amount` est absent, `rewardPerExam` de `payment_configurations` est utilisé.

## Anti double paiement

La référence recommandée est :

```txt
EXAM_REWARD:{examId}
```

Elle est unique en base sur `wallet_transactions.reference`.

## 7. Notification mobile après crédit

Après validation d'une épreuve et crédit du wallet, le use case `CreditWalletFromValidatedExamUseCase` appelle `PaymentNotificationPort`. L'adaptateur FCM envoie alors une notification mobile à l'utilisateur si son `fcm_token` est disponible.
