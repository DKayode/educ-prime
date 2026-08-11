# Edukia — API Type de profil pour le mobile

Guide d'intégration de la **personnalisation par type de profil**. Toutes les
réponses ci-dessous proviennent d'**appels réels** sur l'environnement de dev.

---

## 1. Principe

Un **type de profil** (ex. « Étudiant » 🎓) est une étiquette de personnalisation.

- Chaque utilisateur a **au plus un** type de profil (`type_profil_id`).
- L'admin associe des types de profil à des **entités de contenu** (Événements,
  Opportunités, Forums, Services, Offres).
- Conséquence côté mobile : les **listes de contenu sont filtrées automatiquement**
  par le backend selon le type de profil de l'utilisateur — vous n'avez rien à
  faire de plus que d'appeler les endpoints de contenu habituels.

L'app a donc deux responsabilités seulement :
1. laisser l'utilisateur **choisir** son type de profil (`GET /type-profils` puis
   `PUT /utilisateurs`),
2. **afficher** son type de profil courant (`GET /utilisateurs/profil`).

**Auth.** Tous les endpoints exigent `Authorization: Bearer <token>`.
**Scope pays.** Les lectures portent `?country=benin` (valeurs : `benin`,
`senegal`, `congo`). L'identifiant exposé est `uuid` ; l'`icone` est un **emoji**.

---

## 2. Lister les types de profil — `GET /type-profils?country=benin`

Paginé (`?page=`, `?limit=`, `?search=`). Sert à peupler l'écran de choix.

```json
{
  "data": [
    {
      "id": 13,
      "uuid": "a29557b1-eb56-41bf-9dbc-ce41992832d5",
      "titre": "Étudiant",
      "sous_titre": "Parcours étudiant",
      "icone": "🎓",
      "pays": "benin",
      "date_creation": "2026-07-07T12:36:28.027Z"
    }
  ],
  "total": 1, "page": 1, "limit": 10, "totalPages": 1
}
```

- **`icone`** : emoji à afficher (peut être `null`).
- Les champs hérités `icone_path` / `icone_extension` (ancienne icône fichier R2)
  sont **dormants** — ignorez-les, utilisez `icone`.

---

## 3. Choisir / changer son type de profil — `PUT /utilisateurs`

Écriture ⇒ **pas** de `?country=` (le pays vient du compte). Envoyez l'**id**
numérique (`type_profil_id`). `null` retire l'assignation.

```
PUT /utilisateurs
Authorization: Bearer <token>
Content-Type: application/json

{ "type_profil_id": 13 }
```

⇒ `200 OK`. Pour retirer : `{ "type_profil_id": null }`.

---

## 4. Lire son type de profil — `GET /utilisateurs/profil`

Le profil renvoie l'id brut **et** l'objet résolu :

```json
{
  "type_profil_id": 13,
  "type_profil": {
    "id": 13,
    "uuid": "a29557b1-eb56-41bf-9dbc-ce41992832d5",
    "titre": "Étudiant",
    "sous_titre": "Parcours étudiant",
    "icone": "🎓"
  }
}
```

`type_profil` vaut `null` si l'utilisateur n'en a pas encore choisi.

---

## 5. Visibilité du contenu (automatique)

Vous n'appelez rien de spécial : les endpoints de liste des 5 entités
(`GET /evenements`, `/opportunites`, `/forums`, `/services`, `/offres`) sont
filtrés côté serveur selon le type de profil de l'appelant.

| Situation de l'entité | Ce que voit l'utilisateur |
|---|---|
| Entité **non associée** à un type de profil | visible par **tous** (public) |
| Entité associée à un/des types de profil | visible **si** l'utilisateur partage l'un d'eux |
| Utilisateur **sans** type de profil | ne voit que les entités **non associées** |

L'admin (panneau web) voit tout, sans filtre. Le filtrage est **par entité**
(pas par ligne) : associer « Événements » à « Étudiant » masque *tous* les
événements aux non-étudiants.

---

## 6. Règles & pièges

| Cas | Comportement |
|---|---|
| Choix / lecture | id numérique en écriture ; `uuid` + `icone` (emoji) en lecture. |
| Aucun type choisi | listes de contenu limitées aux entités publiques. |
| Retirer | `PUT /utilisateurs { "type_profil_id": null }`. |
| Icône | toujours l'emoji `icone` (ignorez `icone_path`). |
| Type inexistant / autre pays | `PUT` renvoie `404`. |

---

## 7. Exemple Flutter / Dart

```dart
final base = 'https://api.edukia.net';
final headers = { 'Authorization': 'Bearer $jwt', 'Content-Type': 'application/json' };

// 1) types de profil disponibles (avec emoji)
final types = jsonDecode((await http.get(
  Uri.parse('$base/type-profils?country=benin&limit=100'), headers: headers)).body)['data'];

// 2) enregistrer le choix
await http.put(Uri.parse('$base/utilisateurs'), headers: headers,
  body: jsonEncode({ 'type_profil_id': types.first['id'] }));

// 3) relire le type de profil courant
final profil = jsonDecode((await http.get(
  Uri.parse('$base/utilisateurs/profil'), headers: headers)).body);
final emoji = profil['type_profil']?['icone']; // 🎓
```

---

## 8. Exemple bout-en-bout (curl — appels réels)

```bash
BASE=https://api.edukia.net
# 1) lister
curl -s "$BASE/type-profils?country=benin&limit=100" -H "Authorization: Bearer $JWT"
# ⇒ { "data":[ { "id":13, "uuid":"a295...", "titre":"Étudiant", "icone":"🎓" } ], ... }
# 2) choisir
curl -s -X PUT "$BASE/utilisateurs" -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d '{"type_profil_id":13}'
# ⇒ 200
# 3) relire
curl -s "$BASE/utilisateurs/profil" -H "Authorization: Bearer $JWT"
# ⇒ { "type_profil_id":13, "type_profil":{ "titre":"Étudiant", "icone":"🎓", ... } }
```
