# 004 — Rules Engine

## Règles incluses

1. `WalletFeatureEnabledRule`
2. `VerifiedEmailRule`
3. `UserEnabledRule`
4. `WalletActiveRule`
5. `RestrictionCanWithdrawRule`
6. `AvailableBalanceRule`
7. `MinMaxWithdrawalRule`
8. `NoPendingWithdrawalRule`
9. `WithdrawalLimitRule`
10. `PaymentAccountExistsRule`

## Ajout d’une nouvelle règle

Créer une classe qui implémente :

```ts
BusinessRule<WithdrawalRuleContext>
```

Puis l’ajouter dans `DEFAULT_WITHDRAWAL_RULES`.

## Exemple métier

La vérification de l’adresse mail est volontairement une règle métier en amont : un utilisateur non vérifié ne doit pas pouvoir déclencher une demande de retrait.
