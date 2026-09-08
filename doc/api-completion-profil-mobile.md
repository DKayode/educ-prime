# Complétion du profil — guide mobile

Une nouvelle raison de refus apparaît sur les ressources : le profil de
l'utilisateur n'est pas assez renseigné. Toutes les réponses ci-dessous sont
issues d'**appels réels** sur l'environnement de développement.

Référence : issue [#259](https://github.com/DKayode/edukia/issues/259).
Complète le [guide des quotas gratuits](./api-quotas-gratuits-mobile.md).

---

## 1. La règle

L'administration fixe un **pourcentage de complétion minimal**. En dessous,
l'utilisateur est invité à compléter son profil au lieu d'accéder à la
ressource.

| ressource concernée | code du refus |
|---|---|
| épreuves | `PROFIL_INCOMPLET` |
| examens nationaux | `PROFIL_INCOMPLET` |
| concours | `PROFIL_INCOMPLET` |
| Ketsia | `PROFIL_INCOMPLET` |

Le seuil **prime sur l'abonnement** : un abonné dont le profil est incomplet est
refusé lui aussi. Un administrateur ne l'est jamais.

### ⚠️ Le seuil est DÉSACTIVÉ au lancement

À la mise en production, le seuil est enregistré mais **inactif** : la complétion
est calculée et renvoyée, mais **aucun accès n'est refusé**. Vous pouvez donc
livrer l'écran d'invitation dès maintenant, il ne bloquera personne.

C'est délibéré. Mesuré sur les 26 375 comptes actifs de la base de
développement :

| seuil | comptes qui passeraient |
|---|---|
| 50 % | 545 (2,1 %) |
| 60 % | 193 (0,7 %) |
| 70 % | 1 (0,0 %) |
| 95 % | **0** |

Activer 95 % le jour du déploiement couperait le service à **tout le monde**.
Le back-office affiche ce chiffre au moment du réglage, précisément pour que ça
n'arrive pas.

---

## 2. Lire la complétion

```http
GET /utilisateurs/profil/completion
Authorization: Bearer <token>
```

Réponse réelle, compte fraîchement inscrit :

```json
{
  "pourcentage": 25,
  "champs_total": 16,
  "champs_remplis": 4,
  "seuil_requis": 95,
  "seuil_actif": false,
  "conforme": true,
  "manquants": [
    { "champ": "pseudo", "libelle": "Pseudo" },
    { "champ": "telephone", "libelle": "Numéro de téléphone" },
    { "champ": "photo", "libelle": "Photo de profil" },
    { "champ": "age_group", "libelle": "Tranche d’âge" },
    { "champ": "zone_residence", "libelle": "Zone de résidence" },
    { "champ": "departement_id", "libelle": "Département" },
    { "champ": "ville_id", "libelle": "Ville" },
    { "champ": "etablissement_id", "libelle": "Établissement" },
    { "champ": "filiere_id", "libelle": "Filière" },
    { "champ": "niveau_etude_id", "libelle": "Niveau d’étude" },
    { "champ": "type_profil_id", "libelle": "Type de profil" },
    { "champ": "email_verifie", "libelle": "Email vérifié" }
  ]
}
```

| champ | usage |
|---|---|
| `pourcentage` | la jauge à afficher |
| `champs_total` / `champs_remplis` | « 4 champs sur 16 » |
| `seuil_requis` | le pourcentage à atteindre |
| `seuil_actif` | `false` = **rien n'est bloqué**, l'invitation reste douce |
| `conforme` | la seule valeur à tester pour décider de bloquer ou non |
| `manquants` | la liste à dérouler dans l'écran, `libelle` est prêt à afficher |

> **Testez `conforme`, jamais `pourcentage >= seuil_requis`.** `conforme` vaut
> déjà `true` quand le seuil est inactif ; refaire le calcul vous-même vous
> ferait bloquer des utilisateurs que le serveur laisse passer.
>
> **N'affichez jamais les noms de `champ` à l'écran** : `libelle` est là pour ça.
> `champ` sert uniquement à router vers le bon formulaire.

---

## 3. Le refus

Quand le seuil est actif et que le verrou d'abonnement l'est aussi :

```http
GET /epreuves/6/telechargement
```

```json
{
  "statusCode": 403,
  "error": "PROFIL_INCOMPLET",
  "message": "Complétez votre profil pour accéder à cette ressource.",
  "feature": "EPREUVE_VIEW",
  "quota": { "used": 25, "limit": 95 }
}
```

Ici `quota.used` est le **pourcentage atteint** et `quota.limit` le **seuil
exigé** — le champ est réutilisé pour ne pas multiplier les formes de réponse.

**Aiguillez sur `error`, pas sur le code HTTP.** Trois refus différents partagent
le 403 :

| `error` | ce que l'utilisateur doit faire | écran |
|---|---|---|
| `PROFIL_INCOMPLET` | compléter son profil | formulaire de profil |
| `QUOTA_EXCEEDED` | attendre le mois prochain ou s'abonner | offre d'abonnement |
| `SUBSCRIPTION_REQUIRED` | s'abonner | offre d'abonnement |

Proposer un abonnement à quelqu'un dont le seul tort est un profil incomplet est
le contresens à éviter : **l'abonnement ne débloque rien** dans ce cas.

### Aucun quota n'est consommé

Un refus pour profil incomplet **ne décompte rien**. Vérifié : après un refus, le
compteur de consommations du compte reste à 0. Inutile de prévenir l'utilisateur
qu'il « a perdu une lecture » — ce n'est pas le cas.

---

## 4. `mes-droits`

L'écran d'accueil peut anticiper le refus sans tenter la ressource :

```http
GET /abonnements/mes-droits
```

```json
{
  "verrou_actif": false,
  "droits": {
    "CONCOURS_DOWNLOAD": { "allowed": false, "reason": "PROFIL_INCOMPLET", "quota": { "used": 25, "limit": 95 } },
    "EPREUVE_VIEW":      { "allowed": false, "reason": "PROFIL_INCOMPLET", "quota": { "used": 25, "limit": 95 } },
    "EXAMEN_NAT_VIEW":   { "allowed": false, "reason": "PROFIL_INCOMPLET", "quota": { "used": 25, "limit": 95 } },
    "KETSIA_AI":         { "allowed": false, "reason": "PROFIL_INCOMPLET", "quota": { "used": 25, "limit": 95 } }
  }
}
```

`verrou_actif: false` signifie que **rien n'est réellement refusé** malgré les
`allowed: false` : le serveur journalise et laisse passer. C'est la période
d'observation. Servez-vous-en pour afficher l'invitation à compléter le profil,
sans jamais griser un bouton.

---

## 5. Les 16 champs comptés

| champ | libellé | source |
|---|---|---|
| `nom`, `prenom` | Nom, Prénom | inscription |
| `email` | Adresse email | inscription |
| `sexe` | Sexe | inscription |
| `pseudo` | Pseudo | profil |
| `telephone` | Numéro de téléphone | profil |
| `photo` | Photo de profil | envoi de fichier |
| `age_group` | Tranche d’âge | profil |
| `zone_residence` | Zone de résidence | `rural` ou `urbain` |
| `departement_id`, `ville_id` | Département, Ville | référentiel géo |
| `etablissement_id`, `filiere_id`, `niveau_etude_id` | Établissement, Filière, Niveau d’étude | référentiels |
| `type_profil_id` | Type de profil | référentiel |
| `email_verifie` | Email vérifié | code reçu par email |

`situation_handicap` n'est **pas** compté : la colonne vaut `false` par défaut,
la compter donnerait un point gratuit à tout le monde.

La liste est **réglable** : l'administration peut retirer un champ du calcul, et
il disparaît alors du numérateur comme du dénominateur. Ne codez pas les 16
champs en dur — `champs_total` et `manquants` font foi.

---

## 6. Une conséquence à connaître

Avec 16 champs, chaque champ vaut 6,25 points. Le palier juste avant 100 % est
donc **94 %** (15 champs sur 16) :

```
15/16 → pourcentage: 94, conforme: false  → 403
16/16 → pourcentage: 100, conforme: true  → 200
```

Il n'existe **aucune valeur entre 94 et 100**. Un seuil réglé à 95 % exige en
pratique un profil **entièrement** rempli, y compris l'email vérifié. Le
back-office avertit l'administrateur de cette équivalence.

---

## 7. Ce qu'il y a à faire côté mobile

1. Appeler `GET /utilisateurs/profil/completion` à l'ouverture de l'application.
2. Si `conforme` est `false`, afficher une bannière « Profil incomplet —
   `pourcentage` % » menant au formulaire, avec la liste des `manquants`.
3. Sur un 403, aiguiller sur `error` : `PROFIL_INCOMPLET` → formulaire de profil,
   les deux autres → offre d'abonnement.
4. Rafraîchir la complétion après chaque enregistrement du profil.
5. Ne pas coder en dur le seuil, la liste des champs, ni le nombre 16.
