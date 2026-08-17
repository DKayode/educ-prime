# RBAC Architecture

## Objectif

Edukia migre d'un controle binaire centre sur le role admin vers un modele plus durable base sur des permissions applicatives. Les roles existants restent utiles pour qualifier le type general d'utilisateur, mais les actions sensibles doivent progressivement etre protegees par permissions.

## Etat Actuel

- Les roles systeme sont definis par `RoleType`: `admin`, `etudiant`, `professeur`, `autre`.
- `@Roles(...)` existe et reste supporte pendant la migration.
- `RolesGuard` est le guard de role officiel. Les controleurs ne doivent plus utiliser `RoleGuard`.
- `OwnerOrAdminGuard` reste necessaire pour les ressources appartenant a un utilisateur.
- `JwtStrategy` conserve volontairement l'authentification cross-country. Ne pas ajouter de filtre pays dans la strategie ou dans `/auth/connexion`.

## Architecture Cible

### Role

Le role reste une information stable et limitee sur l'utilisateur. Ne pas ajouter `fondateur`, `directrice`, `developpeur` ou `invite` dans `RoleType` pour modeliser l'organisation.

### Permission

Une permission represente une action precise, par exemple `wallet.withdrawals.approve` ou `users.manage_roles`. Les permissions sont definies dans `backend/src/auth/permissions/permission.enum.ts`.

### Profil De Permissions

Un profil metier, comme directrice ou finance, doit devenir un ensemble de permissions. Ces profils sont persistants en base dans `permission_profiles`, `permission_profile_permissions` et `user_permission_profiles`, sans modifier l'enum `utilisateurs.role` a chaque changement organisationnel.

## Migration Progressive

1. Maintenir `@Roles` sur les routes non migrees.
2. Utiliser `@Permissions` sur les nouveaux domaines sensibles.
3. Mapper temporairement les permissions depuis `RoleType` via `ROLE_PERMISSIONS`.
4. Garder `RoleType.ADMIN` avec toutes les permissions pour compatibilite.
5. Utiliser les profils de permissions persistants pour les fonctions organisationnelles.
6. Charger les permissions effectives cote backend plutot que les stocker dans le JWT.

## Comment Proteger Une Route

Pour une action admin encore non migree :

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
```

Pour une action migree vers permissions :

```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.WALLET_WITHDRAWALS_APPROVE)
```

Si le controleur est deja protege par `@UseGuards(JwtAuthGuard)`, la methode peut ajouter seulement `@UseGuards(PermissionsGuard)`.

## Changement De Droits Et JWT

Le JWT actuel transporte le role et expire en un jour. Les permissions ne doivent pas etre toutes embarquees dans le JWT. Pour un retrait de droits immediat, `token_version` est stocke cote utilisateur, inclus dans le JWT sous `tokenVersion`, puis compare dans `JwtStrategy`. Un changement de role ou de profil de permissions incremente cette version et invalide les anciens access tokens.

## Etat De Cette Iteration

- `RolesGuard` devient le guard de role standard dans les controleurs.
- Le domaine wallet admin utilise des permissions granulaires.
- Les profils de permissions persistants sont disponibles via `AuthorizationModule`.
- `PermissionsGuard` calcule les permissions effectives via `AuthorizationService` avec fallback vers `ROLE_PERMISSIONS` tant que la migration SQL n'est pas appliquee.
- `JwtStrategy` rejette les access tokens dont `tokenVersion` est inferieur a `utilisateurs.token_version`.
- Les autres routes restent documentees dans `docs/rbac-route-inventory.md` pour arbitrage.
