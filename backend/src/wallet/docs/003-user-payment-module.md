# 003 — UserPaymentModule

## Responsabilités

1. Enregistrer le compte Mobile Money de l’utilisateur.
2. Lister les demandes de retrait côté admin.
3. Approuver ou rejeter une demande.
4. Confirmer le paiement manuel.
5. Enregistrer la preuve de paiement.
6. Configurer le module paiement.

## Endpoints

```txt
POST  /user-payment/accounts
GET   /user-payment/accounts/me
GET   /user-payment/admin/withdrawals
POST  /user-payment/admin/withdrawals/:id/approve
POST  /user-payment/admin/withdrawals/:id/reject
POST  /user-payment/admin/withdrawals/:id/confirm-payment
GET   /user-payment/admin/configuration
PATCH /user-payment/admin/configuration
```

## Paiement manuel

L’administrateur effectue le transfert Mobile Money hors système, puis confirme dans le backend avec la référence, le montant, le numéro et la preuve. Cette confirmation crée `PaymentExecution`, `PaymentProof` si fourni, débite le wallet, crée une transaction `WITHDRAW` et notifie l’utilisateur.

## 8. Notifications mobiles liées au paiement

Le module `UserPayment` déclenche maintenant des notifications FCM dans les cas suivants :

- nouvelle demande de retrait créée par l'utilisateur ;
- alerte administrateur pour traitement manuel ;
- paiement Mobile Money confirmé ;
- preuve de paiement disponible dans les métadonnées de notification.

Le paiement manuel reste sous contrôle humain, mais l'utilisateur reçoit une notification mobile dès que l'administrateur marque le transfert comme complété.


## Validation du téléphone Mobile Money

Le compte Mobile Money par défaut doit avoir un numéro au format béninois `+229 01XXXXXXXX`. Cette vérification est appliquée au niveau DTO, use case et Rule Engine avant la soumission d'une demande de retrait.
