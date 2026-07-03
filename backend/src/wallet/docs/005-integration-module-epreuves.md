# 005 — Intégration avec le module de chargement des épreuves

## Options recommandées ( event emitter)

Importer `WalletModule` dans le module épreuves et injecter ou utiliser les event emitter pour éviter un couplage fort entre les modules :

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

Cette option doit rester interne et protégée pour s'assurer des données qui sont stocker dans le wallet d'un utilisateurs

## Info
examId : est une chaine de caractère au format UUID générer après la validation (examen de vérification des règles de validation d'une épreuve) d'une épreuve soumise par un utilisateurs lors de l'appel de l'API qui sert de point d'entrée pour le module wallet/user-payment
