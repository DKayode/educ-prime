# 007 — Installation

1. Copier `src/payment` dans le backend.
2. Copier `test/payment` dans le dossier `test`.
3. Exécuter les SQL de `database/sql` ou les transformer en migrations TypeORM.
4. Importer `PaymentModule` dans le module racine.

```ts
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [PaymentModule],
})
export class AppModule {}
```

5. En production, définir `PAYMENT_INTERNAL_API_KEY`.

## Point de vigilance

Pour très fort trafic, il faut transformer les écritures de crédit et de confirmation de paiement en transaction DB avec verrou pessimiste sur le wallet. Le starter a déjà l’idempotence par référence unique, mais le verrou DB reste préférable en production.
