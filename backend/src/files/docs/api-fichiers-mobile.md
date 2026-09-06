# Edukia — API Fichiers (R2) pour le mobile

> Téléverser et télécharger des fichiers via des URL présignées · Cloudflare R2
> Tous les exemples ci-dessous sont issus d'appels **réels** exécutés sur l'environnement de dev
> (seules la signature et l'identifiant de compte R2 ont été masqués : `<REDACTED>`, `<compte>`).

---

## 1. Principe (à lire en premier)

Le backend ne transporte **jamais** les octets des fichiers. Il délivre des **URL présignées** de courte
durée ; votre application dialogue **directement** avec Cloudflare R2 (PUT pour téléverser, GET pour
télécharger). Deux stockages coexistent :

| Visibilité du *slot* | Où se trouve l'URL | Comment la lire |
|---|---|---|
| **public** (photos, logos, icônes…) | La colonne `<slot>_path` de la ligne contient **déjà l'URL publique complète**. | On l'utilise directement. **Ne PAS appeler `download-url`.** |
| **privé** (PDF d'épreuves, pièces d'identité…) | La ligne ne stocke qu'un chemin logique. | Appeler `GET …/download-url` pour obtenir un GET présigné temporaire. |

- Tous les endpoints `/files/*` exigent l'en-tête `Authorization: Bearer <JWT>`.
- La clé R2 est déterministe : `<entity>/<uuid>/<slot>.<ext>`. Un nouveau téléversement **écrase** en place.
- URL de base (prod) : `https://api.educ-prime.com`

---

## 2. Découvrir ce qui est téléversable — `GET /files/registry`

Renvoie l'ensemble `entity → slot → { authorized, public }`. À récupérer une fois puis mettre en cache.

```json
// Extrait réel
{
  "recruteurs": { "profil": { "authorized": ["jpg","jpeg","png","webp","avif"], "public": true } },
  "categories": { "icone":  { "authorized": ["jpg","jpeg","png","webp","avif"], "public": true } },
  "epreuves":   { "file":   { "authorized": ["pdf"], "public": false } }
}
```

---

## 3. Téléverser un fichier (2 étapes) — public OU privé

Le flux est **identique** pour un slot public ou privé. La seule différence : les en-têtes que R2 exige
sur le PUT (la réponse vous les indique dans `required_headers`).

### Étape 1 — demander une URL de téléversement

`POST /files/<entity>/<uuid>/<slot>/upload-url`

**Corps de la requête** — uniquement l'extension (sans le point) :

```json
{ "extension": "png" }
```

**Réponse réelle** (slot **public** `recruteurs/profil`) :

```json
{
  "url": "https://<compte>.r2.cloudflarestorage.com/recruteurs/06255da6-.../profil.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=<REDACTED>&X-Amz-Date=20260705T231727Z&X-Amz-Expires=600&X-Amz-Signature=<REDACTED>&X-Amz-SignedHeaders=host&x-id=PutObject",
  "method": "PUT",
  "content_type": "image/png",
  "required_headers": {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=31536000, immutable"
  },
  "path": "https://assets-dev.edukia.net/recruteurs/06255da6-.../profil.png",
  "extension": "png",
  "expires_in": 600,
  "public": true
}
```

> Pour un slot **privé** (`epreuves/file`), la réponse est la même **sauf** : `content_type: "application/pdf"`,
> `required_headers: { "Content-Type": "application/pdf" }` (**pas** de `Cache-Control`), `path: "/epreuves/<uuid>/file"`,
> `expires_in: 3600`, `public: false`.

### Étape 2 — PUT des octets directement vers R2

> ⚠️ **Critique :** rejouer **toutes** les clés de `required_headers` **à l'identique** sur le PUT.
> `Content-Type` est **toujours** requis ; `Cache-Control` est requis pour les slots **publics**.
> Envoyer seulement `Content-Type` sur un slot public ⇒ R2 rejette avec `401 SignatureDoesNotMatch`.

```dart
// Flutter / Dart
final res = await http.post(Uri.parse('$base/files/recruteurs/$uuid/profil/upload-url'),
    headers: {'Authorization': 'Bearer $jwt', 'Content-Type': 'application/json'},
    body: jsonEncode({'extension': 'png'}));
final u = jsonDecode(res.body);

// PUT des octets vers R2 — rejouer TOUS les required_headers
final put = await http.put(Uri.parse(u['url']),
    headers: Map<String, String>.from(u['required_headers']),
    body: fileBytes);
// put.statusCode == 200  ⇒  terminé (test réel : HTTP 200).
```

**Slot public :** après le PUT, la colonne `<slot>_path` (ex. `profil_photo_path`) contient l'URL publique
complète — on l'affiche directement. **Aucun appel à `download-url`.**

### Variante — téléversement relayé par le serveur (1 seul appel)

`POST /files/<entity>/<uuid>/<slot>/upload` — `multipart/form-data`, champ nommé `file`. Le serveur pousse
les octets vers R2 à votre place (pas de PUT direct).

```dart
final req = http.MultipartRequest('POST', Uri.parse('$base/files/recruteurs/$uuid/profil/upload'))
  ..headers['Authorization'] = 'Bearer $jwt'
  ..files.add(await http.MultipartFile.fromPath('file', path));
await req.send();
```

---

## 4. Télécharger depuis le stockage PRIVÉ — `GET …/download-url`

`GET /files/<entity>/<uuid>/<slot>/download-url`

Uniquement pour les slots **privés**. Renvoie un GET présigné temporaire que l'on récupère directement.
**Renvoie `400` pour un slot public** — dans ce cas, lire l'URL depuis `<slot>_path` de l'entité.

**Réponse réelle** (slot privé `epreuves/file`, `HTTP 200`) :

```json
{
  "url": "https://<compte>.r2.cloudflarestorage.com/epreuves/1431ba81-.../file.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=<REDACTED>&X-Amz-Date=20260705T231727Z&X-Amz-Expires=3600&X-Amz-Signature=<REDACTED>&X-Amz-SignedHeaders=host&x-id=GetObject",
  "method": "GET",
  "path": "/epreuves/1431ba81-.../file",
  "extension": "pdf",
  "expires_in": 3600,
  "public": false
}
```

```dart
// Flutter / Dart
final r = await http.get(Uri.parse('$base/files/epreuves/$uuid/file/download-url'),
    headers: {'Authorization': 'Bearer $jwt'});
final url = jsonDecode(r.body)['url'];

// GET des octets depuis R2 — AUCUN en-tête Authorization ici (la signature EST l'authentification)
final pdf = await http.get(Uri.parse(url)); // pdf.bodyBytes
```

**Appeler `download-url` sur un slot public renvoie `400`** (message réel) :

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Slot 'recruteurs/profil' is public — no presigned download URL is issued. Read its URL straight from the entity's 'profil_photo_path' field; a plain GET on that URL serves the file."
}
```

---

## 5. Règles & pièges (référence rapide)

| Règle | Détail |
|---|---|
| Auth | `Authorization: Bearer <JWT>` sur tous les appels `/files/*`. L'URL R2 elle-même n'a besoin d'aucun en-tête. |
| Corps de `upload-url` | Exactement `{ "extension": "png" }`. Envoyer `content_type`/`filename` ⇒ `400 "property … should not exist"`. |
| Rejouer les en-têtes | Le PUT doit inclure chaque entrée de `required_headers`. Slot public sans `Cache-Control` ⇒ `401 SignatureDoesNotMatch`. |
| Lecture publique | Lire `<slot>_path` de l'entité. `download-url` renvoie `400` pour un slot public. |
| Lecture privée | Toujours via `download-url`. Ne jamais coder en dur une URL R2. |
| Extensions | Doit figurer dans la liste `authorized` du slot (voir `/files/registry`). Sinon `400`. |
| Expiration | URL de téléversement ~10 min ; téléchargement 10 min (1 h pour les PDF épreuves/concours). Re-demander si expirée. |
| Clé | `<entity>/<uuid>/<slot>.<ext>` — un nouveau téléversement écrase en place. |

---

## 6. Exemple bout-en-bout (curl — appels réels)

```bash
# 1) Obtenir une URL de téléversement pour la photo de profil d'un recruteur (slot PUBLIC)
curl -s -X POST "$BASE/files/recruteurs/$UUID/profil/upload-url" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"extension":"png"}'
# ⇒ 201  { "url": "...", "required_headers": {"Content-Type":"image/png","Cache-Control":"public, max-age=31536000, immutable"}, ... }

# 2) PUT des octets vers R2 en rejouant required_headers  (test réel : HTTP 200)
curl -X PUT "<url de l'étape 1>" \
  -H "Content-Type: image/png" \
  -H "Cache-Control: public, max-age=31536000, immutable" \
  --data-binary @photo.png

# 3) Télécharger un PDF d'épreuve PRIVÉ
curl -s "$BASE/files/epreuves/$UUID/file/download-url" -H "Authorization: Bearer $JWT"
# ⇒ 200  { "url": "...&X-Amz-Signature=...", "method": "GET", "expires_in": 3600, ... }
# puis GET l'"url" renvoyée (sans en-tête Authorization) pour récupérer les octets du PDF
```

---

*Edukia — module `files` (présignation R2). Document généré pour l'intégration mobile.*
*Note : `assets-dev.edukia.net` est l'hôte public de l'environnement de dev ; l'hôte public de prod diffère
mais le mobile lit toujours l'URL telle quelle depuis `<slot>_path`.*
