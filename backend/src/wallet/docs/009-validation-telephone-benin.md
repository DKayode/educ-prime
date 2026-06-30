# 009 - Validation du numéro Mobile Money Bénin

## 1. Objectif

Avant qu'un utilisateur puisse enregistrer un compte Mobile Money ou soumettre une demande de retrait, le module paiement vérifie que le numéro respecte le format béninois attendu :

```txt
+229 01XXXXXXXX
```

Le module accepte les espaces, points ou tirets lors de la saisie, mais il normalise toujours le numéro sous la forme :

```txt
+229 0197000000
```

Les anciens formats comme `+22997000000` sont refusés, car ils ne contiennent pas le préfixe national `01`.

## 2. Fichiers ajoutés

- `src/payment/shared/benin-phone-number.util.ts`
  - `isValidBeninMobileMoneyPhone()` ;
  - `normalizeBeninMobileMoneyPhone()` ;
  - constantes de format et message d'erreur.

## 3. Points de contrôle

### 3.1 Enregistrement du compte Mobile Money

`UpsertPaymentAccountDto` utilise `@Matches()` pour refuser les formats incorrects au niveau DTO.

`UpsertPaymentAccountUseCase` refait la vérification côté application avant persistance, puis normalise le numéro. Cette double vérification évite qu'un appel interne contourne la validation HTTP.

### 3.2 Soumission de la demande de retrait

`RequestWithdrawalUseCase` passe le numéro du compte Mobile Money par défaut au Rule Engine.

La règle `BeninPaymentAccountPhoneRule` refuse la demande si le numéro du compte sélectionné ne respecte pas le format `+229 01XXXXXXXX`.

### 3.3 Confirmation du paiement manuel par l'administrateur

`ConfirmManualPaymentDto` valide le numéro envoyé par l'administrateur.

`ConfirmManualPaymentUseCase` normalise aussi le numéro avant de créer `PaymentExecution`.

## 4. Contraintes SQL

La migration suivante renforce la cohérence côté base de données :

```txt
database/sql/015_add_benin_phone_format_constraints.sql
```

Elle ajoute des contraintes sur :

- `user_payment_accounts.phone_number` ;
- `payment_executions.phone_number`.

Les contraintes sont ajoutées en `NOT VALID` pour éviter de casser une base contenant déjà d'anciens numéros. Elles s'appliquent tout de même aux nouvelles insertions et aux mises à jour.

## 5. Tests ajoutés

- `test/payment/benin-phone-number.util.spec.ts` ;
- `test/payment/upsert-payment-account.use-case.spec.ts` ;
- mise à jour de `test/payment/request-withdrawal.use-case.spec.ts` ;
- mise à jour de `test/payment/confirm-manual-payment.use-case.spec.ts`.
