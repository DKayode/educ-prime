# Guide mobile — Examens Nationaux (soumission & consultation)

Ce guide explique à l'équipe **mobile (Flutter)** comment intégrer la ressource
**Examen National** : comment **soumettre** un nouvel examen (avec son fichier
PDF) et comment **lister / consulter** les examens pour l'utilisateur.

Un *examen national* (BAC, CAP, BEPC, BTS…) n'est **pas** rattaché à la
hiérarchie scolaire (établissement → filière → niveau → matière). Il est
classé par :

- **Type** — BAC, CAP, BEPC, BTS… (obligatoire)
- **Série** — A, C, D, G2… (facultative ; précise le « genre » de BAC)
- **Matière / Filière** — Anglais, Mathématiques, Électricité… (obligatoire)
- **Section** — Normal, Remplacement… (facultative)
- **Année** — obligatoire

Le serveur compose automatiquement l'**intitulé** à partir de ces champs, ex. :
`BAC - A - Philosophie - 2024`.

---

## 1. Conventions générales

- **Base URL** : `{BASE_URL}` (production : `https://api.educ-prime.com`).
- **Authentification** : toutes les requêtes exigent l'en-tête
  `Authorization: Bearer <access_token>`.
- **Pays (multi-pays)** — chaque ressource est isolée par pays :
  - **GET / DELETE** : passez le pays en **query** `?country=<pays>`
    (`benin`, `senegal`, `congo`).
  - **POST / PATCH JSON** : passez le pays dans le **corps** JSON, champ `pays`.
  - **Upload de fichier (multipart)** : passez le pays en **query**
    `?country=<pays>` (le middleware s'exécute avant la lecture du corps).
- **Pagination** : les listes renvoient
  `{ data: [...], total, page, limit, totalPages }`.

> N'envoyez jamais `pays`/`country` dans un DTO JSON en plus du corps : le
> middleware l'extrait puis le retire avant validation.

---

## 2. Les référentiels (pour les filtres et la sélection)

Trois listes servent à **choisir** le type / la série / la matière. Séries et
matières sont **rattachées à un type** : filtrez-les avec `?type_examen=<id>`.

### `GET /types-examen?country=benin`
```json
{ "data": [ { "id": 2, "nom": "BAC", "uuid": "0a48e367-…" },
            { "id": 4, "nom": "BEPC", "uuid": "325e6a3d-…" } ],
  "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
```

### `GET /series?country=benin&type_examen=2`
```json
{ "data": [ { "id": 2, "nom": "A", "type_examen_id": 2 },
            { "id": 3, "nom": "C", "type_examen_id": 2 } ], "total": 4, "…": "…" }
```

### `GET /matieres-filieres-examen?country=benin&type_examen=2`
```json
{ "data": [ { "id": 3, "nom": "Anglais", "type_examen_id": 2 },
            { "id": 2, "nom": "Mathématiques", "type_examen_id": 2 } ], "…": "…" }
```

Ces trois endpoints acceptent aussi `?search=`, `?page=`, `?limit=`.

---

## 3. Lister / consulter les examens nationaux

### `GET /examens-nationaux?country=benin`

Filtres facultatifs (query) : `search`, `type_examen` (id), `serie` (id),
`matiere_filiere_examen` (id), `annee`, `page`, `limit`.

Réponse (un élément) :
```json
{
  "data": [{
    "id": 2,
    "uuid": "f1e47ead-8261-407e-bd01-8281a521441b",
    "titre": "BAC - A - Philosophie - 2024",
    "type_examen_id": 2,   "type_examen": { "id": 2, "nom": "BAC" },
    "serie_id": 2,         "serie": { "id": 2, "nom": "A" },
    "matiere_filiere_examen_id": 4, "matiere_filiere_examen": { "id": 4, "nom": "Philosophie" },
    "section": "Normal",
    "annee": 2024,
    "file_path": "/examens_nationaux/f1e47ead-…/file",
    "file_extension": "pdf",
    "url": "https://storage.googleapis.com/…/examens_nationaux/f1e47ead-…/file.pdf",
    "nombre_pages": 0,
    "nombre_telechargements": 0,
    "date_creation": "2026-08-02T07:35:33.743Z"
  }],
  "total": 8, "page": 1, "limit": 10, "totalPages": 1
}
```

- **`titre`** est déjà composé — affichez-le tel quel.
- **`serie`** peut être `null` (série facultative).

### Années disponibles — `GET /examens-nationaux/annees?country=benin`
```json
[2024, 2023, 2022]
```
Pratique pour un filtre « Année » côté mobile.

### Détail — `GET /examens-nationaux/{id}?country=benin`

### Télécharger le fichier PDF (slot privé)

Le PDF est **privé** : on ne lit pas `file_path` directement, on demande une
**URL signée** de courte durée (1 h), puis on télécharge.

**`GET /files/examens_nationaux/{uuid}/file/download-url?country=benin`**
```json
{
  "url": "https://<compte>.r2.cloudflarestorage.com/examens_nationaux/f1e47ead-…/file.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=<REDACTED>&X-Amz-Date=20260802T075518Z&X-Amz-Expires=3600&X-Amz-Signature=<REDACTED>",
  "expires_in": 3600
}
```
Faites ensuite un **GET simple** (sans en-tête d'auth) sur `url` pour récupérer
les octets du PDF.

> **Transition** : le champ `url` de l'examen contient aussi un lien
> **Firebase** (miroir hérité). Vous pouvez l'utiliser en repli tant que la
> bascule R2 n'est pas terminée, mais l'URL signée `download-url` est le
> chemin recommandé.

### Flutter (Dio) — lister puis télécharger
```dart
final dio = Dio(BaseOptions(baseUrl: BASE_URL,
    headers: {'Authorization': 'Bearer $accessToken'}));

// Liste, filtrée par type + année
final res = await dio.get('/examens-nationaux', queryParameters: {
  'country': pays, 'type_examen': typeId, 'annee': 2024, 'page': 1, 'limit': 20,
});
final examens = res.data['data'] as List;

// Télécharger le PDF d'un examen
final dl = await dio.get('/files/examens_nationaux/${exam['uuid']}/file/download-url',
    queryParameters: {'country': pays});
final signedUrl = dl.data['url'] as String;
await Dio().download(signedUrl, '/chemin/local/examen.pdf'); // GET simple, sans auth
```

---

## 4. Soumettre (ajouter) un examen national

Tout utilisateur authentifié peut **proposer** un examen. La soumission part
en **file d'attente** et sera **validée par un administrateur** avant d'être
publiée. Deux étapes : (1) créer la soumission, (2) téléverser le PDF.

Pour chaque niveau de classement, l'utilisateur fournit **soit un id existant**
(`type_examen_id`, `serie_id`, `matiere_filiere_examen_id`) **soit un nom
proposé** (`proposed_type`, `proposed_serie`, `proposed_matiere_filiere`) que
l'admin résoudra. Le **type** et la **matière/filière** sont obligatoires ; la
**série** est facultative.

### Étape 1 — `POST /examens-nationaux/submissions`
Corps (ids existants) :
```json
{
  "type_examen_id": 2,
  "serie_id": 3,
  "matiere_filiere_examen_id": 2,
  "section": "Normal",
  "annee": 2021,
  "pays": "benin"
}
```
… ou avec des **noms proposés** (si l'utilisateur ne trouve pas dans les listes) :
```json
{
  "proposed_type": "BAC",
  "proposed_serie": "C",
  "proposed_matiere_filiere": "Anglais",
  "section": "Normal",
  "annee": 2021,
  "pays": "benin"
}
```
Réponse (`201`) :
```json
{
  "id": 3,
  "uuid": "ff3977e1-00f0-4d7b-b8f5-65c7d3dea6b8",
  "status": "pending_approval",
  "type_examen_id": 2, "serie_id": 3, "matiere_filiere_examen_id": 2,
  "section": "Normal", "annee": 2021,
  "missing_type": false, "missing_matiere": false, "missing_serie": false
}
```
Récupérez le **`uuid`** — il sert à téléverser le fichier.

### Étape 2 — Téléverser le PDF (multipart)
**`POST /files/examens_nationaux_submissions/{uuid}/file/upload?country=benin`**
- `multipart/form-data`, champ **`file`** (le PDF ; extension `pdf`).
- Le pays va en **query** (`?country=`), pas dans le corps.

Réponse (`201`) :
```json
{ "path": "/examens_nationaux_submissions/ff3977e1-…/file", "extension": "pdf", "public": false }
```

### Étape 3 — Suivre ses soumissions
**`GET /examens-nationaux/submissions/mine?country=benin`** (option `?status=`)
renvoie les soumissions de l'utilisateur avec leur `status`
(`pending_approval` → `approved` / `declined`) et, en cas de refus, le
`decline_reason` (motif à afficher à l'utilisateur).

### Flutter (Dio) — soumettre + téléverser
```dart
// 1) Créer la soumission
final sub = await dio.post('/examens-nationaux/submissions', data: {
  'type_examen_id': typeId,
  'serie_id': serieId,                 // facultatif (ou 'proposed_serie')
  'matiere_filiere_examen_id': matiereId,
  'section': 'Normal',                 // facultatif
  'annee': 2021,
  'pays': pays,
});
final uuid = sub.data['uuid'];

// 2) Téléverser le PDF
final form = FormData.fromMap({
  'file': await MultipartFile.fromFile(pdfPath, filename: 'examen.pdf'),
});
await dio.post('/files/examens_nationaux_submissions/$uuid/file/upload',
    queryParameters: {'country': pays}, data: form);

// 3) (plus tard) suivre le statut
final mine = await dio.get('/examens-nationaux/submissions/mine',
    queryParameters: {'country': pays});
```

---

## 5. Récapitulatif des endpoints

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET | `/types-examen?country=` | Lister les types (filtres/sélection) |
| GET | `/series?country=&type_examen=` | Séries d'un type |
| GET | `/matieres-filieres-examen?country=&type_examen=` | Matières/filières d'un type |
| GET | `/examens-nationaux?country=` | Lister les examens (filtres : `type_examen`, `serie`, `matiere_filiere_examen`, `annee`, `search`) |
| GET | `/examens-nationaux/annees?country=` | Années disponibles |
| GET | `/examens-nationaux/{id}?country=` | Détail d'un examen |
| GET | `/files/examens_nationaux/{uuid}/file/download-url?country=` | URL signée du PDF (1 h) |
| POST | `/examens-nationaux/submissions` | Créer une soumission (`pays` dans le corps) |
| POST | `/files/examens_nationaux_submissions/{uuid}/file/upload?country=` | Téléverser le PDF (multipart, champ `file`) |
| GET | `/examens-nationaux/submissions/mine?country=` | Mes soumissions (+ statut / motif) |

---

## 6. Points d'attention

- **Auth obligatoire** partout (`Bearer`). Un `401` sur une requête = jeton
  expiré/invalide (voir le flux de rafraîchissement standard de l'app).
- **Pays** : GET/upload → `?country=` ; POST JSON → `pays` dans le corps.
- **Série facultative** : ne l'envoyez pas si l'utilisateur ne la renseigne pas.
- **Année obligatoire** à la soumission finale (l'admin ne peut pas approuver
  sans année).
- **Fichier obligatoire** avant approbation : une soumission sans PDF ne sera
  pas validée — enchaînez toujours étape 1 puis étape 2.
- **Cycle de vie** : `pending_approval` → l'admin résout les éléments proposés
  puis approuve (`approved`, l'examen devient visible dans la liste) ou refuse
  (`declined` + `decline_reason`). L'auteur reçoit un email à la décision.
