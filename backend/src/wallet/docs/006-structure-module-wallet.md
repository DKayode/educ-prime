# 010 - Arborescence de l'architecture du module Wallet / UserPayment

```txt
src/wallet/
├── wallet.module.ts                         # Point d'entrée recommandé
├── payment.module.ts                        # Alias propre si l'équipe préfère PaymentModule
├── payment.entities.ts                      # Exports TypeORM centralisés
├── wallet-balance/                          # Domaine Wallet : solde, transactions, retrait
│   ├── domain/
│   ├── dto/
│   ├── entities/
│   ├── use-cases/
│   └── wallet.controller.ts
├── user-payment/                            # Comptes MoMo, admin, paiement manuel
│   ├── dto/
│   ├── entities/
│   ├── use-cases/
│   └── user-payment.controller.ts
├── internal/
│   └── exam-reward-internal.controller.ts   # Endpoint interne crédit épreuve validée
├── shared/                                  # ports, tokens, enums, rules engine
├── infrastructure/                          # adapters TypeORM et Firebase FCM
├── docs/
└── test/
```

## Import à utiliser dans AppModule

```ts
import { WalletModule } from './wallet/wallet.module';
```

Puis dans `imports` :

```ts
WalletModule,
```

Alternative acceptable :

```ts
import { PaymentModule } from './wallet/payment.module';
```

Puis :

```ts
PaymentModule,
```
