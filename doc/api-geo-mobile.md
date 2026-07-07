# Edukia — API Départements & Villes pour le mobile

Guide d'intégration pour le sélecteur géographique du profil (département → ville).
Toutes les réponses ci-dessous sont issues d'**appels réels** sur l'environnement de
développement.

---

## 1. Principe

Chaque pays expose une hiérarchie géographique à **deux niveaux** : un **département**
contient plusieurs **villes**. Le mobile s'en sert pour le profil de l'utilisateur :

1. l'app charge la liste des départements du pays — `GET /departements`.
2. quand l'utilisateur choisit un département, elle charge ses villes —
   `GET /departements/{uuid}/villes`.
3. elle enregistre le choix sur le profil — `PUT /utilisateurs` avec
   `{ departement_id, ville_id }`.
4. `GET /utilisateurs/profil` renvoie ensuite `departement` et `ville` résolus.

**Authentification.** Tous ces endpoints exigent un jeton JWT :
`Authorization: Bearer <token>`.

**Scope pays.** Les lectures (`GET`) portent le pays en query : `?country=benin`
(valeurs : `benin`, `senegal`, `congo`). L'identifiant exposé est toujours `uuid`.

> Remarque : la hiérarchie est générique. Pour le **Sénégal**, le niveau
> « département » contient les **régions** et le niveau « ville » contient les
> **départements** ; pour le **Bénin/Congo**, ce sont départements → communes.

---

## 2. Lister les départements — `GET /departements?country=benin`

Paginé (`?page=`, `?limit=`, `?search=`).

```
GET /departements?country=benin&limit=2
Authorization: Bearer <token>
```

```json
{
  "data": [
    { "uuid": "965b7468-3174-4001-99c6-0af749a0571b", "nom": "Alibori", "code": null, "pays": "benin", "date_creation": "2026-07-07T05:12:00.973Z" },
    { "uuid": "f3e38cb8-a614-490c-b618-ecfb5ca2668f", "nom": "Atacora", "code": null, "pays": "benin", "date_creation": "2026-07-07T05:12:01.285Z" }
  ],
  "total": 12,
  "page": 1,
  "limit": 2,
  "totalPages": 6
}
```

Pour tout charger d'un coup, utilisez un `limit` élevé (ex. `?limit=100`) — le nombre
de départements par pays est petit (12 au Bénin, 14 au Sénégal, 15 au Congo).

---

## 3. Villes d'un département — `GET /departements/{uuid}/villes?country=benin`

**Endpoint recommandé pour le sélecteur en cascade.** Renvoie un tableau simple
`[{ uuid, nom }]` trié par nom. `404` si le département n'existe pas pour ce pays.

```
GET /departements/965b7468-3174-4001-99c6-0af749a0571b/villes?country=benin
Authorization: Bearer <token>
```

```json
[
  { "uuid": "dc674138-0b27-49b9-8663-5aa9a6158819", "nom": "Banikoara" },
  { "uuid": "993ebf7d-120c-45f3-b51b-fe0a1fa93ff7", "nom": "Gogounou" },
  { "uuid": "4a5666a9-8503-46ab-8ef1-34d7f7a10ad9", "nom": "Kandi" }
]
```

### Variante — `GET /villes?departement_id={uuid}&country=benin`

Même filtre, mais **paginé** et avec l'objet `departement` imbriqué. Utile pour une
liste plate de villes ou une recherche (`?search=`).

```json
{
  "data": [
    {
      "uuid": "dc674138-0b27-49b9-8663-5aa9a6158819",
      "nom": "Banikoara",
      "pays": "benin",
      "departement": { "uuid": "965b7468-3174-4001-99c6-0af749a0571b", "nom": "Alibori" }
    }
  ],
  "total": 6, "page": 1, "limit": 2, "totalPages": 3
}
```

---

## 4. Enregistrer le choix sur le profil — `PUT /utilisateurs`

Corps JSON (méthode d'écriture ⇒ le pays est déduit du compte, **pas** de `?country=`).
Envoyez les `uuid` du département et de la ville. `null` efface le champ.

```
PUT /utilisateurs
Authorization: Bearer <token>
Content-Type: application/json

{
  "departement_id": "965b7468-3174-4001-99c6-0af749a0571b",
  "ville_id": "dc674138-0b27-49b9-8663-5aa9a6158819"
}
```

⇒ `200 OK`

Le profil renvoie ensuite les objets résolus :

```
GET /utilisateurs/profil
```

```json
{
  "departement": { "uuid": "965b7468-3174-4001-99c6-0af749a0571b", "nom": "Alibori" },
  "ville":       { "uuid": "dc674138-0b27-49b9-8663-5aa9a6158819", "nom": "Banikoara" },
  "pays": "benin"
}
```

---

## 5. Règles & pièges

| Cas | Comportement |
|---|---|
| Clé exposée | Toujours `uuid` (jamais un id numérique). |
| `ville_id` sans `departement_id` | `400` — une ville ne peut être définie sans département. |
| `ville_id` d'un autre département | `400` — la ville doit appartenir au département envoyé. |
| Département d'un autre pays | `400` — il doit exister pour le pays du compte. |
| Effacer | Envoyer `"departement_id": null` (et/ou `"ville_id": null`). |
| Département introuvable (`/villes`) | `404`. |
| Sénégal | « département » = région, « ville » = département administratif. |

---

## 6. Exemple Flutter / Dart (cascade + enregistrement)

```dart
final base = 'https://api.edukia.net';
final headers = { 'Authorization': 'Bearer $jwt', 'Content-Type': 'application/json' };

// 1) départements du pays
final deps = jsonDecode((await http.get(
  Uri.parse('$base/departements?country=benin&limit=100'), headers: headers)).body)['data'];

// 2) villes du département choisi
final villes = jsonDecode((await http.get(
  Uri.parse('$base/departements/${dep['uuid']}/villes?country=benin'), headers: headers)).body);

// 3) enregistrer sur le profil
await http.put(Uri.parse('$base/utilisateurs'), headers: headers, body: jsonEncode({
  'departement_id': dep['uuid'],
  'ville_id': ville['uuid'],
}));
```

---

## 7. Exemple bout-en-bout (curl — appels réels)

```bash
BASE=https://api.edukia.net
# 1) départements
curl -s "$BASE/departements?country=benin&limit=100" -H "Authorization: Bearer $JWT"
# 2) villes du département Alibori
curl -s "$BASE/departements/965b7468-3174-4001-99c6-0af749a0571b/villes?country=benin" \
  -H "Authorization: Bearer $JWT"
# ⇒ [ { "uuid":"dc674138-...", "nom":"Banikoara" }, ... ]
# 3) enregistrer sur le profil
curl -s -X PUT "$BASE/utilisateurs" -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"departement_id":"965b7468-...","ville_id":"dc674138-..."}'
# ⇒ 200
```
