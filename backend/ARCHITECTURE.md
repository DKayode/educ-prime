# Architecture notes

Short notes on conventions that are not obvious from the code alone.

## ORM: TypeORM is the target, Prisma is still partially in use

The backend is migrating from Prisma to TypeORM. **TypeORM is the runtime ORM
for new code.** Prisma is being phased out but currently still used by:

- `competences`, `types`, `services` services (their entity files exist as
  TypeORM but their service files still call `prisma.<table>`)
- `avis`, `recruteurs` services
- `notification-email` module
- `comments-polymorphic` and `likes-polymorphic` services
- Cross-cutting prisma calls inside otherwise-TypeORM services
  (e.g. `offres.service.ts` aggregates `avis` via prisma)

When adding new code, use TypeORM. When touching a still-prisma file, prefer
finishing its migration over piling onto the prisma usage.

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
