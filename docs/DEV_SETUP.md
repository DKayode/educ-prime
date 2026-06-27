# Edukia — dev / test environment setup

Onboarding for new developers. Goal: get a working **test** environment that
never touches production data.

> ⚠️ **Golden rule:** dev machines use the **`edukia-dev`** Neon database. **Never**
> point your local setup at the production database.
>
> R2 (file storage): dev uses the **`edukia-dev`** private bucket and the
> **`edukia-public-dev`** public bucket (served at `assets-dev.edukia.net`).
> Never the prod buckets (`edukia` / `edukia-public` at `assets.edukia.net`).

---

## 1. Prerequisites

- Node 20 + npm
- Docker + Docker Compose v2 (for the bundled redis, and the all-in-one path)
- Access to the team secrets (see step 2)

## 2. Get the secrets

These files are **gitignored** — you create them from the committed `*.example`
templates and fill in real values. Ask a maintainer for the shared **test**
credentials (or the secrets vault link):

| You create | From template | What it holds |
|---|---|---|
| `backend/.env` | `backend/.env.example` | DB URL (edukia-dev), JWT, R2 (dev), SMTP, Firebase |
| `frontend/.env` | `frontend/.env.example` | `VITE_API_URL` |
| `.env` (root) | `.env.example` | same vars, for docker-compose |
| `backend/config/config.json` | `backend/config/config.example.json` | countries + app metadata |
| `backend/config/firebase-serviceaccount.json` | `backend/config/firebase-serviceaccount.example.json` | Firebase key (**backend won't boot without it**) |

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp .env.example .env
cp backend/config/config.example.json backend/config/config.json
cp backend/config/firebase-serviceaccount.example.json backend/config/firebase-serviceaccount.json
# then edit each and paste the real TEST values
```

The `DATABASE_URL` you receive must point at **edukia-dev**. If it says
`edukia-prod` / the production host, stop and ask — that's the wrong one.

## 3. Run it

### Option A — Docker (closest to prod)
```bash
docker compose -f docker-compose.dev.yml up -d --build
# backend + frontend + nginx + redis. App via nginx; API under /backend.
docker compose -f docker-compose.dev.yml logs -f backend
```

### Option B — Local (fast iteration)
```bash
# 1) redis (BullMQ needs it)
docker compose -f docker-compose.dev.yml up -d redis
# 2) backend
cd backend && npm install && npm run start:dev      # http://localhost:3000
# 3) frontend (new shell)
cd frontend && npm install && npm run dev            # http://localhost:8080
```

## 4. Database schema (edukia-dev)

Schema/migrations live in the sister repo
[`edukia-db`](https://github.com/DKayode/edukia-db) as raw SQL — never Prisma
migrate / TypeORM synchronize. The `edukia-dev` database must have the schema
applied. To apply a migration against edukia-dev, point the apply script at the
edukia-dev connection string:

```bash
cd ../edukia-db
DATABASE_URL="<edukia-dev url>" ./scripts/apply-migration.sh 0XX_description.sql
```

(Ask a maintainer whether edukia-dev is already seeded/migrated before running.)

## 5. Smoke check

```bash
curl http://localhost:3000/countries     # -> configured countries (no auth)
```
Then log in via the frontend and confirm the country switcher + a list page work.

## 6. Conventions (read before pushing)

- Work on a feature branch → PR → squash-merge. Never push to `main`.
- Country scoping: services take `pays` as the first arg via `@CurrentCountry()`.
- Files go through `FilesModule` (R2 presign) + `<FileImage>`.
- SQL migrations go in `edukia-db`, raw + idempotent, applied to the DB before the
  dependent code merges.
- See `CLAUDE.md` / `AGENTS.md` for the full architecture rules.
