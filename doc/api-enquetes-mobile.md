# Edukia — API Enquêtes (formulaires de satisfaction) pour le mobile

> Récupérer la campagne active et soumettre les réponses de l'utilisateur.
> Exemples issus d'appels **réels** sur l'environnement de dev.

---

## 1. Principe

Un admin crée des **campagnes** d'enquête depuis le dashboard. Le mobile :

1. à l'**ouverture de l'app**, appelle `GET /forms/active` pour récupérer la campagne active que
   l'utilisateur **n'a pas encore remplie** ;
2. **affiche** le formulaire (sections + questions) ;
3. **soumet** les réponses via `POST /forms/:uuid/responses`.

- Les deux endpoints exigent `Authorization: Bearer <JWT>`.
- Portée par **pays** : passer `?country=<slug>` (ex. `benin`) sur le `GET`.
- **Une seule réponse par utilisateur et par campagne** (nouvelle tentative ⇒ `409`).
- URL de base (prod) : `https://api.educ-prime.com`

---

## 2. Récupérer la campagne active — `GET /forms/active?country=benin`

Renvoie la campagne active non répondue (arbre complet à afficher), ou **`null`** s'il n'y en a aucune.

```json
// Réponse RÉELLE
{
  "uuid": "ecdc3ee0-2dad-40b4-bc43-5acaa466e82e",
  "titre": "Enquête de satisfaction",
  "description": "Pour chaque rubrique, coche l’option qui te correspond le mieux.",
  "statut": "active",
  "trigger_type": "app_open",
  "date_debut": "2026-07-06T05:38:57.736Z",
  "date_fin": null,
  "pays": "benin",
  "sections": [
    {
      "uuid": "336f3312-384c-42fb-8d72-bf9e76a876ec",
      "titre": "Études & Carrière",
      "icone": "📚",
      "ordre": 0,
      "questions": [
        { "uuid": "af2d0011-c349-4ab5-8cdd-1731ca7e5293", "libelle": "Épreuves",           "type": "rating", "ordre": 0 },
        { "uuid": "a24338b2-bff6-422c-b491-96a7c9a07977", "libelle": "Emploi & Jobkia",     "type": "rating", "ordre": 1 },
        { "uuid": "f7b6f7cf-9fe8-4de9-b4fb-0551e721ff60", "libelle": "Bourses et stages",   "type": "rating", "ordre": 2 }
      ]
    },
    {
      "uuid": "49439c0e-1947-4666-8d1c-7efa6e858032",
      "titre": "Partage & Inspiration",
      "icone": "💡",
      "ordre": 1,
      "questions": [
        { "uuid": "e53198c5-...", "libelle": "Parcours inspirants", "type": "rating", "ordre": 0 },
        { "uuid": "da899492-...", "libelle": "Forum",               "type": "rating", "ordre": 1 }
      ]
    },
    {
      "uuid": "0923d5ba-...",
      "titre": "Ton avis compte",
      "icone": "💬",
      "ordre": 2,
      "questions": [
        { "uuid": "b1c2...", "libelle": "Fonctionnalité préférée et pourquoi ?", "type": "text", "ordre": 0 }
      ]
    }
  ]
}
```

**Comment afficher** (par section, dans l'ordre `ordre`) :

- `type: "rating"` → l'échelle à **4 options** :

  | valeur `rating` | libellé | emoji |
  |:--:|---|:--:|
  | 4 | Top | 😍 |
  | 3 | Utile | 🙂 |
  | 2 | Moyen | 😐 |
  | 1 | Pas utile | 😞 |

- `type: "text"` → un champ de saisie libre (textarea).

---

## 3. Soumettre les réponses — `POST /forms/:uuid/responses?country=benin`

`:uuid` = celui de la campagne. Corps : un tableau `answers`, une entrée par question répondue.
Chaque entrée porte `question_id` (l'`uuid` de la question) **plus** `rating` (1–4) **ou** `texte`.

```json
// Corps de la requête
{
  "answers": [
    { "question_id": "af2d0011-c349-4ab5-8cdd-1731ca7e5293", "rating": 4 },
    { "question_id": "a24338b2-bff6-422c-b491-96a7c9a07977", "rating": 3 },
    { "question_id": "f7b6f7cf-9fe8-4de9-b4fb-0551e721ff60", "rating": 2 },
    { "question_id": "e53198c5-...", "rating": 4 },
    { "question_id": "da899492-...", "rating": 3 },
    { "question_id": "b1c2...", "texte": "Les épreuves, super utiles pour réviser." }
  ]
}
```

```json
// Réponse RÉELLE — HTTP 201
{ "uuid": "ac32bcb6-d334-4b22-9931-c13408f8caec", "submitted_at": "2026-07-06T05:38:57.991Z" }
```

- Après soumission, `GET /forms/active` ne renvoie plus cette campagne pour cet utilisateur.
- Re-soumettre la même campagne par le même utilisateur ⇒ **`409`** (déjà répondu).

### Exemple Flutter / Dart

```dart
// 1) récupérer la campagne active à l'ouverture
final r = await http.get(Uri.parse('$base/forms/active?country=benin'),
    headers: {'Authorization': 'Bearer $jwt'});
if (r.body == 'null' || r.body.isEmpty) return;        // aucune enquête à montrer
final camp = jsonDecode(r.body);

// 2) …afficher camp['sections'] → questions (rating = échelle 4 emojis, text = textarea)…

// 3) soumettre
final answers = [
  {'question_id': qEpreuvesUuid, 'rating': 4},
  {'question_id': qTexteUuid,    'texte': 'Les épreuves 😍'},
];
final s = await http.post(Uri.parse('$base/forms/${camp['uuid']}/responses?country=benin'),
    headers: {'Authorization': 'Bearer $jwt', 'Content-Type': 'application/json'},
    body: jsonEncode({'answers': answers}));
// s.statusCode == 201 ⇒ merci ! (409 ⇒ déjà répondu)
```

---

## 4. Règles & pièges

| Règle | Détail |
|---|---|
| Auth | `Authorization: Bearer <JWT>` sur les deux endpoints. |
| Pays | `?country=<slug>` sur le `GET` (défaut `benin`). |
| `rating` | Entier **1 à 4** (1 = Pas utile … 4 = Top). Sinon `400`. |
| `answers` | `question_id` = l'`uuid` de la question ; `rating` **ou** `texte` selon `type`. |
| Une réponse | 1 seule par utilisateur/campagne. Re-soumission ⇒ `409`. |
| Rien à montrer | `GET /forms/active` renvoie `null` si aucune campagne active non répondue. |

---

## 5. Exemple bout-en-bout (curl — appels réels)

```bash
# 1) campagne active pour cet utilisateur
curl -s "$BASE/forms/active?country=benin" -H "Authorization: Bearer $JWT"
# ⇒ 200  { "uuid":"ecdc3ee0-...", "titre":"...", "sections":[ { "questions":[ {"uuid":"af2d...","type":"rating"}, ... ] } ] }

# 2) soumettre les réponses
curl -s -X POST "$BASE/forms/ecdc3ee0-.../responses?country=benin" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"answers":[{"question_id":"af2d...","rating":4},{"question_id":"b1c2...","texte":"Super"}]}'
# ⇒ 201  { "uuid":"ac32bcb6-...", "submitted_at":"2026-07-06T05:38:57.991Z" }
```

---

*Edukia — module `forms` (enquêtes de satisfaction). Document généré pour l'intégration mobile.*
