# Architecture notes

Short notes on conventions that are not obvious from the code alone.

## ORM: TypeORM is the target, Prisma is still partially in use

The backend is migrating from Prisma to TypeORM. **TypeORM is the runtime ORM
for new code.** Prisma is being phased out but currently still used by:

- `notification-email` module
- `comments-polymorphic` and `likes-polymorphic` services
- Cross-cutting prisma calls inside `offres.service.ts` (avis aggregations,
  utilisateur/recruteur lookups)

When adding new code, use TypeORM. When touching a still-prisma file, prefer
finishing its migration over piling onto the prisma usage.

## Multi-country configuration: `backend/config/config.json`

The backend is being expanded to multiple countries (Benin, Senegal, Congo).
Each country has its own database; the URL list is in
`backend/config/config.json`:

```json
[
    { "country": "benin",   "config": { "database": "postgresql://...", "storage": "" } },
    { "country": "senegal", "config": { "database": "postgresql://...", "storage": "" } },
    { "country": "congo",   "config": { "database": "postgresql://...", "storage": "" } }
]
```

Important properties:

- The file is **gitignored** (root `.gitignore`) — it contains live DB
  credentials and must never be committed.
- It is **injected at Docker build time** by `.github/workflows/docker-build.yml`
  from the `COUNTRY_CONFIG` GitHub secret. Same pattern as
  `firebase-serviceaccount.json`.
- The `Dockerfile` already copies the entire `config/` directory into the
  image (`COPY --from=builder /app/config ./config`).
- Loaded by `backend/src/config/country-config.ts` (helper) and
  `CountryConfigService` (DI-injectable). The helper is also called at
  module-definition time in `app.module.ts` to register one **named TypeORM
  connection per country** (in addition to the legacy default connection
  driven by `DATABASE_URL`).
- For local dev, drop a `config.json` in `backend/config/` with the same
  shape. If the file is missing, no named connections are registered and
  the backend falls back to the default `DATABASE_URL` connection.

**Phase A only sets up the connections**; per-request routing to the
correct DB based on a country parameter lands in Phase B.

## Schema: managed in the edukia-db sister repository

Neither `prisma/schema.prisma` nor TypeORM's `synchronize` is the source of
truth for the database schema. Schema changes live as **raw SQL migration
files** in the **edukia-db** sister repository, applied per-country via
its `apply-migration.sh`. Don't suggest `prisma migrate dev`, `prisma db
push`, or TypeORM migrations — they're not in use here.

## Likes and comments: polymorphic for new code

Two parallel systems coexist:

- **Legacy** `likes` and `commentaires` are hard-bound to `parcours` and
  the `commentaires` entity. They stay in place until `parcours` is migrated.
- **Polymorphic** `likes-polymorphic` and `comments-polymorphic` attach to
  any entity via discriminator. **Use these for any new feature.** Forum
  already does.

## Identifiers: int `id` plus uuid

Every business table has an autoincrement `id: number` (internal PK and
foreign keys) **and** a stable `uuid: string` (external/API identifier).
On entities, the column is declared with a DB-side default so existing
rows are populated automatically:

```ts
@Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
uuid: string;
```

The matching SQL pattern is the existing `utilisateurs.uuid` column.
