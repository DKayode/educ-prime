# 005 — Intégration avec le module de chargement des épreuves

## Option recommandée

Importer `WalletModule` dans le module épreuves et injecter :

```ts
CreditWalletFromValidatedExamUseCase
```

Puis appeler :

```ts
await creditWalletFromValidatedExam.execute({
  userId,
  examId,
  amount,
  currency: 'XOF',
  description: 'Épreuve validée',
});
```

## Option endpoint interne

```txt
POST /internal/payment/exam-rewards/credit
Header: x-internal-api-key: <PAYMENT_INTERNAL_API_KEY>
```

Cette option doit rester interne et protégée.
