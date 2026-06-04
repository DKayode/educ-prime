# Files pipeline — manual test schema

Covers the four changes:
1. Longer presigned-GET TTL for **private** slots.
2. `uuid` present in every entity JSON (incl. `epreuves` / `ressources`).
3. Upload routes private→private bucket, public→public bucket — and the
   `required_headers` fix that makes public uploads actually work.

Set these once (any REST client / shell):

```bash
BASE=https://api.educ-prime.com        # or http://localhost:3000
COUNTRY=benin
TOKEN=...                               # JWT from POST /auth/connexion
AUTH="Authorization: Bearer $TOKEN"
```

Get a token:

```bash
curl -s -X POST "$BASE/auth/connexion" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemple.com","mot_de_passe":"<pwd>"}' | jq .access_token
```

---

## (2) `uuid` present in entity JSON

Pick any owning entity; `uuid` must be in each item. The two that were
previously missing it are `epreuves` and `ressources`:

```bash
# epreuves — expect .data[].uuid (and file_path / file_extension) present
curl -s "$BASE/epreuves?country=$COUNTRY&page=1&limit=2" -H "$AUTH" \
  | jq '.data[] | {id, uuid, file_path, file_extension}'

# ressources — same
curl -s "$BASE/ressources?country=$COUNTRY&page=1&limit=2" -H "$AUTH" \
  | jq '.data[] | {id, uuid, file_path, file_extension}'

# spot-check a few public-bucket entities too
curl -s "$BASE/etablissements?country=$COUNTRY&limit=2" -H "$AUTH" | jq '.data[].uuid'
curl -s "$BASE/categories?country=$COUNTRY&limit=2"      -H "$AUTH" | jq '.data[].uuid'
```

PASS: every item has a non-null `uuid`.
FAIL (regression): `uuid` is `null` / absent → the entity's `findAll`
projection dropped it.

---

## (3) Upload routes to the correct bucket + public uploads work

The flow is two steps: ask backend for a presigned PUT, then PUT the bytes
to R2 **replaying `required_headers`**.

### 3a. PUBLIC slot (e.g. `categories/icone`) — was failing before

```bash
CAT_UUID=$(curl -s "$BASE/categories?country=$COUNTRY&limit=1" -H "$AUTH" | jq -r '.data[0].uuid')

# Step 1: presign. Note: response.public == true, and required_headers
# carries BOTH Content-Type and Cache-Control.
PRES=$(curl -s -X POST "$BASE/files/categories/$CAT_UUID/icone/upload-url?country=$COUNTRY" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"extension":"png"}')
echo "$PRES" | jq '{public, expires_in, required_headers, path}'

URL=$(echo "$PRES" | jq -r '.url')

# Step 2: PUT replaying EXACTLY the signed headers. This is the fix —
# Cache-Control must be sent or R2 returns 401 SignatureDoesNotMatch.
curl -i -X PUT "$URL" \
  -H 'Content-Type: image/png' \
  -H 'Cache-Control: public, max-age=31536000, immutable' \
  --data-binary @/path/to/test.png
# expect: HTTP/1.1 200 OK

# Negative control — omit Cache-Control → expect 403 SignatureDoesNotMatch
curl -i -X PUT "$URL" -H 'Content-Type: image/png' --data-binary @/path/to/test.png

# Verify object landed in the PUBLIC bucket: response.path is a full URL;
# a plain GET (no auth) must return 200.
echo "$PRES" | jq -r '.path'                     # https://<public-host>/categories/<uuid>/icone.png
curl -I "$(echo "$PRES" | jq -r '.path')"        # expect 200, Cache-Control: ...immutable
```

PASS: PUT with both headers → 200; `path` is a full public URL; anonymous
GET on it → 200.

### 3b. PRIVATE slot (e.g. `epreuves/file`) — routes to private bucket

```bash
EPR_UUID=$(curl -s "$BASE/epreuves?country=$COUNTRY&limit=1" -H "$AUTH" | jq -r '.data[0].uuid')

PRES=$(curl -s -X POST "$BASE/files/epreuves/$EPR_UUID/file/upload-url?country=$COUNTRY" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"extension":"pdf"}')
echo "$PRES" | jq '{public, required_headers, path}'   # public:false; path is /epreuves/<uuid>/file (logical, NOT a URL)

URL=$(echo "$PRES" | jq -r '.url')
curl -i -X PUT "$URL" -H 'Content-Type: application/pdf' --data-binary @/path/to/test.pdf
# expect 200 (private slot signs no Cache-Control, so Content-Type alone is correct)

# Confirm it is NOT publicly readable: there is no public URL for it.
# Anonymous GET against the public host for this key must 404/403.
curl -I "https://<public-host>/epreuves/$EPR_UUID/file.pdf"   # expect 403/404
```

PASS: `public:false`, `path` is the logical `/epreuves/<uuid>/file`, PUT
200, and the object is not anonymously reachable.

---

## (1) Private presigned-GET link lives longer

```bash
# Private slot only. expires_in should be 600 (10 min) by default,
# or whatever PRESIGN_DOWNLOAD_TTL_SECONDS is set to.
curl -s "$BASE/files/epreuves/$EPR_UUID/file/download-url?country=$COUNTRY" -H "$AUTH" \
  | jq '{expires_in, public, url}'

# The signed URL should GET 200 within the 10-minute window.
DL=$(curl -s "$BASE/files/epreuves/$EPR_UUID/file/download-url?country=$COUNTRY" -H "$AUTH" | jq -r '.url')
curl -I "$DL"          # 200 now, up to expires_in (600s)

# Public slot must be REJECTED here (use the entity's <slot>_path instead):
curl -s -o /dev/null -w '%{http_code}\n' \
  "$BASE/files/categories/$CAT_UUID/icone/download-url?country=$COUNTRY" -H "$AUTH"
# expect 400
```

PASS: private `expires_in` == 600 (or configured value); link valid within
the window; public slot → 400.

To change the TTL, set in `backend/.env` (and the deploy `.env`):

```
PRESIGN_DOWNLOAD_TTL_SECONDS=86400   # e.g. 24h; capped at 604800 (7 days)
```

---

## Notes / gotchas

- **R2 CORS**: for browser uploads to public slots, the bucket's CORS rule
  for the admin origin must allow the `Cache-Control` **request header** on
  `PUT` (in addition to `Content-Type`). The admin frontend
  (`filesService.uploadFile`) now replays `required_headers` automatically.
- The server-proxied `POST .../upload` path already set the bucket +
  Cache-Control correctly and was never affected by the signature bug; it's
  the direct presigned PUT that needed the header replay.
- Bucket routing is driven solely by `public: true` in
  `backend/src/files/registry.ts`. Private file slots today:
  `epreuves.file`, `ressources.file`, `utilisateurs.profil`,
  `prestataires.identity`.
