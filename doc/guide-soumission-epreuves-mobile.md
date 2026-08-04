# Guide d'intégration mobile — Soumission d'épreuves (avec type d'épreuve)

Ce guide explique comment l'**application mobile** permet à un utilisateur de
**soumettre une épreuve** pour validation par un administrateur, en précisant
son **type** — **`Examens`** ou **`Examens Nationaux`**.

Il s'adresse aux **développeurs Flutter/mobile**. Tous les exemples proviennent
de vraies requêtes contre le backend (les signatures R2 sont masquées).

> ### 🆕 Nouveautés (août 2026)
> - Le champ **`type`** est désormais transmis de bout en bout : l'app peut le
>   déclarer à la soumission, l'admin peut le corriger, et l'épreuve créée en
>   hérite.
> - **Deux types seulement** : `Examens` (défaut) ou `Examens Nationaux`. Toute
>   autre valeur — ou une absence — est **ramenée à `Examens`** par le serveur
>   (voir §2). Les anciens types `Interrogation` / `Devoirs` / `Concours` ne
>   sont plus retenus pour une épreuve.

---

## 1. Vue d'ensemble

Une soumission d'épreuve se fait en **deux étapes** :

1. **Créer la soumission** (métadonnées) — `POST /epreuves/submissions`.
   La réponse renvoie un **`uuid`** qui identifie la soumission.
2. **Téléverser le fichier PDF** de l'épreuve, rattaché à cet `uuid`.

La soumission arrive ensuite dans la **file d'attente admin** avec le statut
`pending_approval`. Un administrateur la **résout / corrige** puis
l'**approuve** (l'épreuve réelle est alors créée et devient visible) ou la
**refuse** (avec un motif).

> **Authentification.** Toutes les requêtes exigent un **JWT** utilisateur :
> en-tête `Authorization: Bearer <token>`. La soumission est automatiquement
> rattachée à l'utilisateur du token (`soumis_par`).

> **Pays (multi-tenant).** Le backend est scindé par pays. Le contrat est :
> - `POST` JSON → champ **`pays`** dans le corps (ex. `"benin"`).
> - `GET` / téléversement `multipart` → paramètre d'URL **`?country=<pays>`**.
>
> Si le pays est omis, `benin` est utilisé par défaut.

---

## 2. Les types d'épreuve

Le champ **`type`** classe l'épreuve. Seules **deux** valeurs sont retenues :

| Valeur envoyée      | Signification                          |
|---------------------|----------------------------------------|
| `Examens`           | Examen (valeur **par défaut**)         |
| `Examens Nationaux` | Examen national (BAC, BEPC, CAP, BTS…) |

> **Deux types seulement.** Une épreuve est soit **`Examens`**, soit
> **`Examens Nationaux`**. **Toute autre valeur** — absente, vide, ou un ancien
> type (`Interrogation`, `Devoirs`, `Concours`) — est **automatiquement ramenée
> à `Examens`** par le serveur, à la soumission comme à l'approbation, et pour
> une création directe côté tableau de bord.

> **Valeur par défaut = `Examens`.** Le `type` est **facultatif** : ne l'envoyez
> que pour marquer une épreuve comme **`Examens Nationaux`** ; sinon elle sera
> `Examens`.

> **`Examens Nationaux`** contient un espace — envoyez la chaîne **exactement**
> `"Examens Nationaux"` (sinon la valeur retombe sur `Examens`).

---

## 3. Étape 1 — Créer la soumission

`POST /epreuves/submissions`

### Corps de la requête (JSON)

Chaque niveau parent peut être fourni **soit** par un id existant, **soit** par
un nom proposé (`proposed_*`) que l'admin créera. En pratique, l'app envoie le
plus souvent la **matière** (`matiere_id`), qui à elle seule fixe toute la
chaîne (matière → niveau → filière → établissement).

| Champ                   | Type    | Requis | Description                                                        |
|-------------------------|---------|--------|--------------------------------------------------------------------|
| `matiere_id`            | int     | –      | Id d'une matière existante (recommandé : fixe toute la chaîne).     |
| `proposed_matiere`      | string  | –      | Nom de matière à créer (si pas d'id).                              |
| `etablissement_id`      | int     | –      | Id d'établissement existant.                                       |
| `proposed_etablissement`| string  | –      | Nom d'établissement à créer.                                       |
| `filiere_id`            | int     | –      | Id de filière existante.                                           |
| `proposed_filiere`      | string  | –      | Nom de filière à créer.                                            |
| `niveau_etude_id`       | int     | –      | Id de niveau d'étude existant.                                     |
| `proposed_niveau`       | string  | –      | Nom de niveau d'étude à créer.                                     |
| **`type`**              | string  | –      | `Examens` ou `Examens Nationaux` (voir §2). Toute autre valeur → `Examens`. |
| `annee`                 | int     | –      | Année de l'épreuve (ex. `2024`).                                   |
| `section`               | string  | –      | `normal` (défaut) ou `rattrapage`.                                |
| `pays`                  | string  | –      | Pays (défaut `benin`).                                             |

> **Le `titre` n'est PAS à envoyer.** Il est **construit automatiquement**
> côté serveur à partir de *matière — session — année* (ex.
> `"CAS PRATIQUE — normal — 2094"`). Tout `titre` envoyé est ignoré.

### Exemple de requête

```bash
curl -X POST "https://<api>/epreuves/submissions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "matiere_id": 14,
    "annee": 2094,
    "section": "normal",
    "type": "Examens Nationaux",
    "pays": "benin"
  }'
```

### Réponse `201 Created` (réelle)

```json
{
  "matiere_id": 14,
  "proposed_matiere": null,
  "titre": "CAS PRATIQUE — normal — 2094",
  "type": "Examens Nationaux",
  "annee": 2094,
  "section": "normal",
  "pays": "benin",
  "soumis_par_id": 1,
  "status": "pending_approval",
  "decline_reason": null,
  "id": 55,
  "uuid": "285d4aed-6636-42bf-beec-c6ddffdc0a21",
  "file_path": "",
  "file_extension": "",
  "url": "",
  "date_creation": "2026-08-04T00:02:06.076Z"
}
```

> Gardez le **`uuid`** (`285d4aed-…`) : il identifie la soumission à l'étape 2.

> **Anti-doublon.** Une soumission identique déjà en attente (mêmes parents +
> année + session) est refusée avec un `409 Conflict`. De même, si l'épreuve
> réelle existe déjà, la création est refusée.

---

## 4. Étape 2 — Téléverser le fichier PDF

Le fichier de l'épreuve est un **PDF** (slot privé). Deux méthodes ; **la
méthode A (URL présignée) est recommandée sur mobile** (l'app envoie les octets
directement à R2, le backend ne relaie rien).

### Méthode A — URL présignée (recommandée)

**A.1** Demander une URL de téléversement :

`POST /files/epreuve_submissions/:uuid/file/upload-url?country=<pays>`

```json
{ "extension": "pdf" }
```

Réponse `201` (réelle, signature masquée) :

```json
{
  "url": "https://<compte>.r2.cloudflarestorage.com/epreuve_submissions/29d7b257-…/file.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&X-Amz-Signature=<REDACTED>&…",
  "method": "PUT",
  "content_type": "application/pdf",
  "required_headers": {
    "Content-Type": "application/pdf"
  },
  "path": "/epreuve_submissions/29d7b257-…/file",
  "extension": "pdf",
  "expires_in": 3600,
  "public": false
}
```

**A.2** Envoyer les octets à cette `url` en **`PUT`**, en **rejouant à
l'identique** tous les en-têtes de `required_headers` :

```bash
curl -X PUT "<url présignée>" \
  -H "Content-Type: application/pdf" \
  --data-binary @epreuve.pdf
```

> ⚠️ **Rejouez `required_headers` tel quel.** Pour ce slot privé, c'est
> `Content-Type: application/pdf`. Un en-tête manquant ou différent →
> R2 renvoie `401 SignatureDoesNotMatch` et le téléversement échoue.
> L'URL présignée expire après **1 heure** (`expires_in: 3600`).

### Méthode B — Téléversement relayé (repli)

Si l'app ne peut pas faire de `PUT` direct, envoyez le fichier en
`multipart/form-data` (champ **`file`**) au serveur :

`POST /files/epreuve_submissions/:uuid/file/upload?country=<pays>`

```bash
curl -X POST "https://<api>/files/epreuve_submissions/<uuid>/file/upload?country=benin" \
  -H "Authorization: Bearer <token>" \
  -F "file=@epreuve.pdf;type=application/pdf"
```

> Extensions autorisées : **PDF uniquement**. Le paramètre `?country=` est
> requis (le middleware pays s'exécute avant l'analyse du multipart).

---

## 5. Lister « mes soumissions »

`GET /epreuves/submissions/mine?country=<pays>&page=1&limit=10`

Renvoie **uniquement les soumissions de l'utilisateur** du token (jamais celles
des autres), les plus récentes d'abord, avec le **`type`**, le statut, le
fichier et les parents résolus.

Réponse `200` (réelle, tronquée) :

```json
{
  "data": [
    {
      "id": 55,
      "uuid": "285d4aed-6636-42bf-beec-c6ddffdc0a21",
      "titre": "CAS PRATIQUE — normal — 2094",
      "type": "Examens Nationaux",
      "annee": 2094,
      "section": "normal",
      "status": "pending_approval",
      "decline_reason": null,
      "file_extension": "pdf",
      "matiere": { "id": 14, "nom": "CAS PRATIQUE" },
      "niveau_etude": { "id": 1785, "nom": "Licence 1" },
      "filiere": { "id": 116, "nom": "Droit & Sciences Politiques" },
      "etablissement": { "id": 31, "nom": "Faculté de Droit … (FADESP) - UAC" },
      "missing": { "etablissement": false, "filiere": false, "niveau_etude": false, "matiere": false }
    }
  ],
  "total": 22,
  "page": 1,
  "limit": 2,
  "totalPages": 11
}
```

> Les nouvelles soumissions portent toujours un `type` normalisé (`Examens` ou
> `Examens Nationaux`). Une soumission **ancienne** peut encore renvoyer
> `"type": null` : dans ce cas l'épreuve créée à l'approbation recevra `Examens`.
>
> Filtrez par statut avec `?status=pending_approval|approved|declined`.

---

## 6. Cycle de vie & statuts

| Statut             | Signification                                                    |
|--------------------|-----------------------------------------------------------------|
| `pending_approval` | En attente de validation par un admin.                          |
| `approved`         | Approuvée : l'épreuve réelle a été créée (auteur notifié email). |
| `declined`         | Refusée ; le motif est dans `decline_reason` (notifié email).   |

À l'**approbation**, l'admin peut avoir corrigé le `type` depuis le tableau de
bord (il ne peut choisir que `Examens` ou `Examens Nationaux`) ; l'épreuve créée
hérite alors du `type` **de la soumission** (ou `Examens` par défaut si aucun).

---

## 7. Exemple Flutter (Dart)

```dart
// Étape 1 — créer la soumission (avec type).
final createRes = await http.post(
  Uri.parse('$apiBase/epreuves/submissions'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'matiere_id': matiereId,
    'annee': 2024,
    'section': 'normal',
    'type': 'Examens Nationaux', // omettre pour le défaut « Examens »
    'pays': country,             // ex. 'benin'
  }),
);
final sub = jsonDecode(createRes.body);
final uuid = sub['uuid'] as String;

// Étape 2A — URL présignée puis PUT direct vers R2.
final urlRes = await http.post(
  Uri.parse('$apiBase/files/epreuve_submissions/$uuid/file/upload-url?country=$country'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({'extension': 'pdf'}),
);
final presigned = jsonDecode(urlRes.body);
final requiredHeaders = Map<String, String>.from(presigned['required_headers']);

await http.put(
  Uri.parse(presigned['url']),
  headers: requiredHeaders, // rejouer TELS QUELS (Content-Type: application/pdf)
  body: await File(pdfPath).readAsBytes(),
);
```

---

## 8. Récapitulatif

- **2 étapes** : `POST /epreuves/submissions` (métadonnées + `type`) → puis
  téléversement du PDF sur l'`uuid` renvoyé.
- **`type` facultatif** ; **deux valeurs seulement** : `Examens` (défaut) ou
  `Examens Nationaux`. Toute autre valeur (ou absence) → `Examens`, à la
  soumission comme à la création tableau de bord.
- **`titre` auto-construit** — ne pas l'envoyer.
- **Pays** : `pays` dans le corps JSON, `?country=` pour GET / multipart.
- **Fichier PDF** privé : URL présignée (recommandée, rejouer
  `required_headers`) ou téléversement relayé (`multipart`, champ `file`).
- Suivi via `GET /epreuves/submissions/mine`.
