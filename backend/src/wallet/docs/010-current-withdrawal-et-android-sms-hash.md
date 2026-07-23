# 016 — Demande de retrait courante & hash Android SMS

## 1. Demande de retrait courante

Une nouvelle route utilisateur permet à l'application mobile de connaître la demande de retrait actuellement active pour l'utilisateur connecté.

```http
GET /wallet/withdrawals/current
Authorization: Bearer <token>
```

Cette route retourne :

- `hasCurrentWithdrawal` : indique si une demande active existe ;
- `withdrawal` : informations principales de la demande ;
- `otp` : dernier OTP lié à la demande, avec son statut, sa livraison et ses tentatives.

Elle permet notamment au mobile de reprendre correctement l'écran après fermeture de l'application, perte réseau ou relance du téléphone.

## 2. Hash Android SMS Retriever

Le SMS OTP peut maintenant recevoir automatiquement une dernière ligne contenant le hash Android SMS Retriever de l'application mobile.

Variable d'environnement :

```env
OTP_ANDROID_SMS_HASH=FA+9qCX9VSu
```

Si la variable est vide, aucune ligne n'est ajoutée. Si elle est renseignée, le SMS envoyé devient par exemple :

```txt
EDUKIA : votre code de validation retrait est 123456. Il expire dans 10 minutes.
FA+9qCX9VSu
```

La chaîne est ajoutée dans l'adapter SMS afin que le comportement soit centralisé, quel que soit le scénario d'envoi OTP : première demande, renvoi sécurisé, mode console ou Infobip.

## 3. Sécurité

Le hash Android SMS n'est pas un secret serveur. Il sert à permettre à Android d'identifier les SMS destinés à l'application. Il ne remplace pas la validation OTP côté backend.

Le code OTP reste stocké en base sous forme de hash, avec expiration, limite de tentatives et blocage de sécurité.
