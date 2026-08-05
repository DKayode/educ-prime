# Guide d'intégration — Examens Nationaux (API)

Ce guide s'adresse aux **développeurs** (mobile / front / intégrations) qui
consomment la ressource **Examens Nationaux** de l'API Edukia. Tous les exemples
proviennent de vraies requêtes contre le backend (signatures R2 masquées).

---

## 1. Vue d'ensemble

Un **examen national** est une ressource autonome (sœur des épreuves / concours)
qui n'est **pas** rattachée à la hiérarchie scolaire. Il est classé par des
**listes de référence** administrables, toutes **scopées à un type d'examen** :

| Niveau | Table / endpoint | Obligatoire ? |
|---|---|---|
| **Type d'examen** | `types-examen` (BAC, BEPC, BTS, CAP, Licence…) | **oui** |
| **Série** | `series` (A, C, D, G2…) | non |
| **Matière** | `matieres-examen` (Mathématiques, Droit Civil…) | *optionnelle* |
| **Filière** | `filieres-examen` (Droit, Économie…) | *optionnelle* |
| **Section** | champ texte (`Normal`, `Remplacement`) | non |
| **Année** | entier | **oui** |

> **Règle matière / filière.** Matière et filière sont **deux champs
> indépendants et optionnels**, mais **au moins l'un des deux** doit être
> renseigné. Exemples : un **BAC** porte une **matière** ; une **Licence** porte
> une **filière + une matière**. Un examen sans matière **ni** filière est
> refusé (`400`).

> **Intitulé (`titre`) auto-composé côté serveur** :
> `type - série? - filière? - matière? - année` — ne l'envoyez jamais.
> Ex. `"Licence - Droit - Droit Civil - 2027"`, `"BAC - C - Mathématiques - 2024"`.

Comme les épreuves / concours, la ressource expose **deux voies** :
- **Admin** : CRUD direct (`/examens-nationaux`).
- **Utilisateur** : soumission → file d'attente → approbation admin
  (`/examens-nationaux/submissions`).

### Authentification & pays

- Toutes les requêtes exigent un **JWT** : `Authorization: Bearer <token>`.
- **Pays (multi-tenant)** :
  - `GET` / `DELETE` / upload `multipart` → paramètre d'URL **`?country=<pays>`**.
  - `POST` / `PUT` / `PATCH` JSON → champ **`pays`** dans le corps.
  - Absent ⇒ `benin` par défaut.

---

## 2. Listes de référence (lookups)

Toutes exposent le même contrat : `GET` paginé, `POST` / `PATCH` / `DELETE`.
Les enfants (`series`, `matieres-examen`, `filieres-examen`) se filtrent par
**`?type_examen=<id>`**.

### `GET /types-examen`

```json
{
  "data": [
    { "id": 1, "uuid": "c5e3fd1c-…", "nom": "BAC", "description": null },
    { "id": 5, "uuid": "aa98659e-…", "nom": "Licence", "description": null }
  ],
  "total": 6, "page": 1, "limit": 20, "totalPages": 1
}
```

Query : `page`, `limit`, `search`, `sort_by` (`nom` | `date_creation`),
`sort_order` (`ASC` | `DESC`).

### `GET /matieres-examen?type_examen=5` · `GET /filieres-examen?type_examen=5`

```json
[
  { "id": 4, "uuid": "3715e60d-…", "type_examen_id": 5, "nom": "Droit Civil",
    "type_examen": { "id": 5, "nom": "Licence" } }
]
```
> `matieres-examen` et `filieres-examen` ont **exactement la même forme** —
> ce sont deux lookups parallèles. `GET /series?type_examen=5` aussi.
> Query commun : `page`, `limit`, `search`, `type_examen`.

### Créer un lookup (admin)

```bash
curl -X POST "https://<api>/matieres-examen" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{ "nom": "Droit des Contrats", "type_examen_id": 5, "pays": "benin" }'
```
`POST /types-examen` ne prend que `{ nom, description?, pays }` (pas de parent).

---

## 3. Ressource admin — `/examens-nationaux`

### Créer — `POST /examens-nationaux`

Corps : `type_examen_id` (req), `annee` (req), **`matiere_examen_id` et/ou
`filiere_examen_id`** (au moins un), `serie_id?`, `section?`, `nombre_pages?`.

```bash
curl -X POST "https://<api>/examens-nationaux" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{ "type_examen_id": 5, "filiere_examen_id": 1, "matiere_examen_id": 4,
        "annee": 2027, "section": "Normal", "pays": "benin" }'
```

Réponse `201` (réelle) :

```json
{
  "type_examen_id": 5, "matiere_examen_id": 4, "filiere_examen_id": 1,
  "serie_id": null, "section": "Normal", "annee": 2027,
  "titre": "Licence - Droit - Droit Civil - 2027",
  "id": 8, "uuid": "13a65cdc-…", "file_path": "", "file_extension": "", "url": "",
  "nombre_pages": 0, "nombre_telechargements": 0, "date_creation": "2026-08-05T…"
}
```

> `matiere_examen_id` **ni** `filiere_examen_id` fourni ⇒ `400`
> « *Au moins une matière ou une filière est requise.* »

### Fichier (PDF)

Le fichier est un **slot privé R2**, uploadé après la création sur l'`uuid`
renvoyé — voir §5 (même mécanisme que pour une soumission, entité
`examens_nationaux`).

### Lister — `GET /examens-nationaux` (avec filtres)

| Query | Effet |
|---|---|
| `search` | intitulé (unaccent, ILIKE) |
| `type_examen` | id du type |
| `serie` | id de série |
| **`matiere_examen`** | id de matière |
| **`filiere_examen`** | id de filière |
| `annee` | année exacte |
| `page`, `limit` | pagination |

```bash
GET /examens-nationaux?country=benin&type_examen=5&filiere_examen=1
```
```json
{ "data": [ { "titre": "Licence - Droit - Droit Civil - 2027",
              "matiere_examen": { "id": 4, "nom": "Droit Civil" },
              "filiere_examen": { "id": 1, "nom": "Droit" } } ],
  "total": 2, "page": 1, "limit": 10, "totalPages": 1 }
```
Chaque ligne inclut les relations `type_examen`, `serie`, `matiere_examen`,
`filiere_examen` (l'une des deux dernières peut être `null`).

- `PUT /examens-nationaux/:id` — mêmes champs ; le `titre` est recomposé.
- `DELETE /examens-nationaux/:id?country=benin`
- `GET /examens-nationaux/annees?country=benin` → `[2027, 2024, …]`

---

## 4. Soumission utilisateur — `POST /examens-nationaux/submissions`

Tout utilisateur connecté propose un examen national. Pour **chaque niveau**,
envoyez **soit un id existant, soit un nom proposé** (`proposed_*`) que l'admin
résoudra. Il faut : un **type** (id ou proposé) **et au moins une matière OU
filière** (id ou proposée).

| Champ | | Champ | |
|---|---|---|---|
| `type_examen_id` | ou `proposed_type` | `serie_id` | ou `proposed_serie` |
| `matiere_examen_id` | ou `proposed_matiere` | `filiere_examen_id` | ou `proposed_filiere` |
| `section?` | | `annee?` | |

```bash
curl -X POST "https://<api>/examens-nationaux/submissions" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{ "type_examen_id": 5, "filiere_examen_id": 1,
        "proposed_matiere": "Droit des Contrats",
        "annee": 2027, "section": "Normal", "pays": "benin" }'
```

Réponse `201` (réelle) — noter les **drapeaux `missing_*`** :

```json
{
  "id": 6, "uuid": "2a2d7f6c-…", "status": "pending_approval",
  "type_examen_id": 5, "proposed_type": null,
  "filiere_examen_id": 1, "proposed_filiere": null,
  "matiere_examen_id": null, "proposed_matiere": "Droit des Contrats",
  "serie_id": null, "proposed_serie": null,
  "section": "Normal", "annee": 2027, "titre": "",
  "missing_type": false, "missing_serie": false,
  "missing_matiere": true, "missing_filiere": false,
  "missing_classifier": false
}
```

Drapeaux (calculés côté serveur, utiles pour l'UI) :
- `missing_type` — type non résolu (id absent).
- `missing_serie` / `missing_matiere` / `missing_filiere` — un **nom proposé**
  n'a pas encore été résolu en id réel.
- `missing_classifier` — **ni** matière **ni** filière résolue (bloque
  l'approbation).

> Conservez l'**`uuid`** : il sert à téléverser le fichier (§5).

`GET /examens-nationaux/submissions/mine?country=benin&status=…` liste les
soumissions de l'utilisateur (mêmes lignes + drapeaux).

---

## 5. Téléverser le fichier (slot privé R2)

Entité `examens_nationaux_submissions` (soumission) ou `examens_nationaux`
(ressource admin), slot `file`. **Méthode A recommandée** (mobile) : URL
présignée + `PUT` direct.

**A.1** `POST /files/examens_nationaux_submissions/:uuid/file/upload-url?country=benin`
avec `{ "extension": "pdf" }` → réponse `201` (réelle, signature masquée) :

```json
{
  "url": "https://<compte>.r2.cloudflarestorage.com/examens_nationaux_submissions/2a2d7f6c-…/file.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&X-Amz-Signature=<REDACTED>&…",
  "method": "PUT",
  "required_headers": { "Content-Type": "application/pdf" },
  "expires_in": 3600, "public": false
}
```

**A.2** `PUT` les octets à cette `url` en **rejouant `required_headers` tel
quel** (`Content-Type: application/pdf`). L'URL expire après 1 h.

**Méthode B (repli)** : `POST /files/examens_nationaux_submissions/:uuid/file/upload?country=benin`
en `multipart/form-data`, champ **`file`**. PDF uniquement.

---

## 6. Approbation admin — `/examens-nationaux/submissions`

### Lister la file — `GET /examens-nationaux/submissions`

Query : `status` (`pending_approval` | `approved` | `declined` | `all` ;
défaut `pending_approval`), `page`, `limit`, et les **filtres** :
`type_examen`, `matiere_examen`, `filiere_examen` (id).

> Les filtres matière/filière/type sont **id-based** : ils ne remontent que les
> soumissions **déjà résolues** à un lookup réel — une soumission encore en
> *nom proposé* (id absent) n'apparaît sous aucun de ces filtres.

### Résoudre — `PATCH /examens-nationaux/submissions/:id`

Pour chaque niveau : passez un **id réel** (le `proposed_*` correspondant est
effacé) **ou** écrasez le nom proposé. `section` / `annee` éditables.

```bash
curl -X PATCH "https://<api>/examens-nationaux/submissions/6" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{ "matiere_examen_id": 8, "pays": "benin" }'
```
→ `missing_matiere` repasse à `false`, `matiere_examen` est renseignée.

### Approuver — `PATCH /examens-nationaux/submissions/:id/approve`

Pré-requis : **type résolu**, **au moins une matière OU filière résolue**,
**année** présente, **fichier** attaché. Crée le vrai examen national
(intitulé composé, fichier promu dans son propre dossier R2), passe la
soumission à `approved`, **notifie l'auteur** et **crédite son wallet**.

Corps optionnel de dernière minute : `{ type_examen_id?, serie_id?,
matiere_examen_id?, filiere_examen_id? }`. Réponse : `{ message,
submission, examen_national }`.

### Refuser — `PATCH /examens-nationaux/submissions/:id/decline`

`{ "reason": "…" }` (optionnel) → statut `declined`, motif renvoyé à l'auteur.

---

## 7. Récompense wallet

À l'**approbation d'une soumission** (pas pour une création admin directe),
l'**auteur** est crédité du **`rewardPerExam`** standard — **le même montant que
pour une épreuve ou un concours validé** (il n'y a pas de récompense spécifique
aux examens nationaux). Le crédit est :
- **conditionné** à `walletEnabled` + `rewardEnabled` ;
- **idempotent** (référence `EXAM_REWARD:<uuid de l'examen>`) — ré-approuver ne
  crédite jamais deux fois ;
- **best-effort** : un échec wallet n'annule jamais l'approbation ;
- **en attente** (`pending`) si `reviewDelayHours > 0`, sinon **disponible**.

---

## 8. Récapitulatif des endpoints

| Méthode | Endpoint | Rôle |
|---|---|---|
| GET/POST/PATCH/DELETE | `/types-examen` | types (BAC, Licence…) |
| GET/POST/PATCH/DELETE | `/series` | séries `?type_examen=` |
| GET/POST/PATCH/DELETE | `/matieres-examen` | matières `?type_examen=` |
| GET/POST/PATCH/DELETE | `/filieres-examen` | filières `?type_examen=` |
| GET/POST/PUT/DELETE | `/examens-nationaux` | ressource (+ filtres type/matiere/filiere/serie/annee) |
| GET | `/examens-nationaux/annees` | années distinctes |
| POST | `/examens-nationaux/submissions` | soumettre (user) |
| GET | `/examens-nationaux/submissions` | file admin (+ filtres) |
| GET | `/examens-nationaux/submissions/mine` | mes soumissions |
| PATCH | `/…/submissions/:id` | résoudre |
| PATCH | `/…/submissions/:id/approve` \| `/decline` | approuver / refuser |
| POST | `/files/examens_nationaux(_submissions)/:uuid/file/upload-url` | URL présignée PDF |

**À retenir** : type + année obligatoires ; **au moins matière OU filière** ;
`titre` auto-composé ; pays via `?country=` (GET/DELETE/upload) ou `pays`
(JSON) ; fichier PDF privé via R2 présigné.
