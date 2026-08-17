# RBAC Route Inventory

Generated from backend controllers after Batch 5 persistent authorization profile implementation. Classifications are conservative and must be reviewed before broad authorization changes.

## backend/src\app-version\app-version.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /app/version/check | check | none | none | PUBLIC_READ | keep |  |
| GET | /app/version/admin | findAll | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| POST | /app/version/admin | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /app/version/admin/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /app/version/admin/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\app.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /stats | getStats | JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\auth\auth.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /auth/register | register | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /auth/connexion | login | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /auth/refresh | refresh | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /auth/deconnexion | logout | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| POST | /auth/forgot-password | forgotPassword | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /auth/reset-password | resetPassword | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |



## backend/src\authorization\authorization.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /authorization/permissions | listPermissions | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Lists available backend permission constants. |
| GET | /authorization/profiles | listProfiles | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Lists persistent permission profiles. |
| POST | /authorization/profiles | createProfile | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Creates persistent permission profiles. |
| GET | /authorization/profiles/:id | getProfile | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Reads one permission profile. |
| PATCH | /authorization/profiles/:id | updateProfile | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Updates profile metadata and permissions. |
| DELETE | /authorization/profiles/:id | deleteProfile | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Refuses system profile deletion. |
| POST | /authorization/users/:userId/profiles | assignProfile | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Assigns a profile to a user. |
| DELETE | /authorization/users/:userId/profiles/:profileId | removeProfile | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Removes a profile assignment. |
| GET | /authorization/users/:userId/permissions | getUserAuthorization | JwtAuthGuard, PermissionsGuard | Permission.AUTHORIZATION_MANAGE | ADMIN_ACTION | keep permission | Audits effective permissions for a user. |

## backend/src\avis\avis.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /avis | create | JwtAuthGuard; JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /avis/:model/:id | findAllByModel | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /avis/:id | update | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /avis/:id | remove | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\categories\categories.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /categories | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /categories | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /categories/stats | getStats | none | none | PUBLIC_READ | keep |  |
| GET | /categories/:id | findOne | none | none | PUBLIC_READ | keep |  |
| GET | /categories/slug/:slug | findOneBySlug | none | none | PUBLIC_READ | keep |  |
| PATCH | /categories/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PATCH | /categories/:id/icone | uploadIcon | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /categories/:id/icone | getIcon | none | none | PUBLIC_READ | keep |  |
| DELETE | /categories/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\commentaires\commentaires.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /commentaires | create | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /commentaires | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/stats | getStats | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/:id/replies | findReplies | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/parcours/:parcoursId | findByParcours | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/user | findByUser | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/:id/utilisateurs/photo | getUtilisateurPhoto | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /commentaires/:id | remove | JwtAuthGuard; JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\comments-polymorphic\comments-polymorphic.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /commentaires/:model/:id | create | JwtAuthGuard; JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /commentaires/:model/:id/count | count | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /commentaires/:model/:id | findAllByEntity | JwtAuthGuard; JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /commentaires/:id | update | JwtAuthGuard; JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /commentaires/:model/:id | remove | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\competences\competences.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /competences | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /competences/:id | findOne | none | none | PUBLIC_READ | keep |  |
| POST | /competences | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /competences/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /competences/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\concours\concours-submissions.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /concours/submissions | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /concours/submissions | findMine | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /concours/submissions | findAll | JwtAuthGuard, PermissionsGuard | Permission.CONCOURS_READ | ADMIN_ACTION | keep permission |  |
| PATCH | /concours/submissions/:id | update | JwtAuthGuard, PermissionsGuard | Permission.CONCOURS_UPDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /concours/submissions/:id/resolve | resolve | JwtAuthGuard, PermissionsGuard | Permission.CONCOURS_UPDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /concours/submissions/:id/approve | approve | JwtAuthGuard, PermissionsGuard | Permission.CONCOURS_VALIDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /concours/submissions/:id/decline | decline | JwtAuthGuard, PermissionsGuard | Permission.CONCOURS_VALIDATE | ADMIN_ACTION | keep permission |  |

## backend/src\concours\concours.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /concours | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /concours | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /concours | findGroupedV1 | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /concours/annees | getAnnees | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /concours/:id/telechargement | downloadFile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /concours/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /concours/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /concours/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\config\app.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /app | get | none | none | PUBLIC_READ | keep |  |

## backend/src\config\countries.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /countries | list | none | none | PUBLIC_READ | keep |  |

## backend/src\contacts-professionnels\contacts-professionnels.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /contacts-professionnels | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /contacts-professionnels | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /contacts-professionnels/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /contacts-professionnels/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /contacts-professionnels/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\departements\departement.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /departements | create | JwtAuthGuard; JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| POST | /departements/import-csv | importCsv | JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /departements | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /departements/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /departements/:id/villes | findVilles | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /departements/:id | update | JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /departements/:id | remove | JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\epreuves\epreuves.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /epreuves | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /epreuves | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /epreuves/:id/telechargement | downloadFile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /epreuves/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /epreuves/:id | update | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| DELETE | /epreuves/:id | remove | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |

## backend/src\epreuves\submissions\epreuve-submissions.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /epreuves/submissions | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /epreuves/submissions | findMine | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /epreuves/submissions | findAll | JwtAuthGuard, PermissionsGuard | Permission.EPREUVES_READ | ADMIN_ACTION | keep permission |  |
| PATCH | /epreuves/submissions/:id | resolve | JwtAuthGuard, PermissionsGuard | Permission.EPREUVES_UPDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /epreuves/submissions/:id/approve | approve | JwtAuthGuard, PermissionsGuard | Permission.EPREUVES_VALIDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /epreuves/submissions/:id/decline | decline | JwtAuthGuard, PermissionsGuard | Permission.EPREUVES_VALIDATE | ADMIN_ACTION | keep permission |  |

## backend/src\etablissements\etablissements.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /etablissements | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /etablissements | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /etablissements/:id/logo | downloadLogo | none | none | PUBLIC_READ | keep |  |
| GET | /etablissements/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /etablissements/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /etablissements/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /etablissements/:id/filieres | findFilieres | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /etablissements/:id/filieres/:filiereId/niveau-etude | findNiveauEtude | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /etablissements/:id/filieres/:filiereId/niveau-etude/:niveauId/matieres | findMatieres | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /etablissements/:id/filieres/:filiereId/niveau-etude/:niveauId/epreuves | findEpreuves | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\evenements\evenements.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /evenements | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /evenements | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /evenements/:id/type-profils | getTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /evenements/:id/type-profils | setTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /evenements/:id/telechargement | downloadFile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /evenements/:id/image | viewImage | none | none | PUBLIC_READ | keep |  |
| GET | /evenements/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /evenements/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /evenements/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\examens-nationaux\examens-nationaux-submissions.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /examens-nationaux/submissions | create | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /examens-nationaux/submissions/mine | findMine | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /examens-nationaux/submissions | findAll | JwtAuthGuard, PermissionsGuard | Permission.EXAMENS_NATIONAUX_READ | ADMIN_ACTION | keep permission |  |
| PATCH | /examens-nationaux/submissions/:id | update | JwtAuthGuard, PermissionsGuard | Permission.EXAMENS_NATIONAUX_UPDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /examens-nationaux/submissions/:id/approve | approve | JwtAuthGuard, PermissionsGuard | Permission.EXAMENS_NATIONAUX_VALIDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /examens-nationaux/submissions/:id/decline | decline | JwtAuthGuard, PermissionsGuard | Permission.EXAMENS_NATIONAUX_VALIDATE | ADMIN_ACTION | keep permission |  |

## backend/src\examens-nationaux\examens-nationaux.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /examens-nationaux | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /examens-nationaux | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /examens-nationaux/annees | getAnnees | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /examens-nationaux/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /examens-nationaux/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /examens-nationaux/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\favoris\favoris.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /favoris | create | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /favoris | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /favoris/stats | getStats | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /favoris/check/:parcoursId/:userId | isFavori | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /favoris/parcours/:parcoursId/count | getFavoriCount | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /favoris/parcours/:parcoursId | findByParcours | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /favoris/user/:userId | findByUser | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /favoris/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /favoris/:id | update | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /favoris/:id | remove | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /favoris/parcours/:parcoursId/user/:userId | removeByParcoursAndUser | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\fichiers\fichiers.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /fichiers | uploadFile | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /fichiers/telechargement | downloadFile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| DELETE | /fichiers | deleteFile | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |

## backend/src\files\files.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /files/registry | getRegistry | JwtAuthGuard; JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| POST | /files/:entity/:uuid/:slot/upload-url | createUploadUrl | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /files/:entity/:uuid/:slot/upload | proxyUpload | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /files/:entity/:uuid/:slot/download-url | createDownloadUrl | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\filieres-examen\filieres-examen.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /filieres-examen | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /filieres-examen | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /filieres-examen/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /filieres-examen/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /filieres-examen/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\filieres\filieres.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /filieres | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /filieres | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /filieres/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /filieres/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /filieres/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\firebase\firebase.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /firebase | create | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /firebase | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /firebase/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /firebase/:id | update | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| DELETE | /firebase/:id | remove | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |

## backend/src\forms\forms-user.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /forms/active | getActive | JwtAuthGuard; JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| POST | /forms/:uuid/responses | submit | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\forms\forms.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /forms | create | JwtAuthGuard, RolesGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN; RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /forms | findAll | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /forms/:uuid | findOne | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /forms/:uuid/results | getResults | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /forms/:uuid | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PATCH | /forms/:uuid | updateMeta | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PATCH | /forms/:uuid/statut | updateStatut | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /forms/:uuid | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\forum\forum.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /forums | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /forums | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /forums/:id/type-profils | getTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /forums/:id/type-profils | setTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /forums/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| DELETE | /forums/:id | remove | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /forums/:id/photo | uploadPhoto | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /forums/:id/photo | getPhoto | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /forums/:id | update | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |

## backend/src\kpi\kpi.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /kpi | getKpis | JwtAuthGuard, PermissionsGuard | Permission.STATS_READ | ADMIN_ACTION | keep permission |  |

## backend/src\likes-polymorphic\likes-polymorphic.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /likes/:model/:id | toggleLike | JwtAuthGuard; JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /likes/:model/:id/count | getLikeCount | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\likes\likes.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /likes | create | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /likes | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /likes/check | checkUserLike | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /likes/parcours/:parcoursId/stats | getParcoursStats | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /likes/parcours/:parcoursId/likers | getParcoursLikers | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /likes/commentaire/:commentaireId/likers | getCommentaireLikers | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /likes/user/:userId | findByUser | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /likes/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /likes/:id | update | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /likes/:id | remove | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\matieres-examen\matieres-examen.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /matieres-examen | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /matieres-examen | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /matieres-examen/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /matieres-examen/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /matieres-examen/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\matieres\matieres.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /matieres | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN, RoleType.PROFESSEUR | ADMIN_ACTION | admin/permission |  |
| GET | /matieres | findAll | JwtAuthGuard; JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /matieres/grouper-par-nom | findGroupedByName | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /matieres/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /matieres/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN, RoleType.PROFESSEUR | ADMIN_ACTION | admin/permission |  |
| DELETE | /matieres/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN, RoleType.PROFESSEUR | ADMIN_ACTION | admin/permission |  |

## backend/src\niveau-etude\niveau-etude.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /niveau-etude | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /niveau-etude | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /niveau-etude/grouper-par-nom | findGroupByName | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /niveau-etude/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /niveau-etude/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /niveau-etude/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /niveau-etude/grouper-par-nom/:nom | removeGroup | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\notification-email\notification-email.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /notification-email | sendNotificationEmail | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_SEND | ADMIN_ACTION | keep permission |  |
| GET | /notification-email/status/:id | getStatus | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_READ | ADMIN_ACTION | keep permission |  |
| POST | /notification-email/unsubscribe | unsubscribe | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /notification-email/cancel/:id | cancelJob | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_CANCEL | ADMIN_ACTION | keep permission |  |
| POST | /notification-email/drain | drainQueue | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_CANCEL | ADMIN_ACTION | keep permission |  |

## backend/src\notifications\notifications.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /notifications | getNotifications | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_READ | ADMIN_ACTION | keep permission |  |
| POST | /notifications | sendNotification | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_SEND | ADMIN_ACTION | keep permission |  |
| GET | /notifications/status/:id | getStatus | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_READ | ADMIN_ACTION | keep permission |  |
| POST | /notifications/cancel/:id | cancelJob | JwtAuthGuard, PermissionsGuard | Permission.NOTIFICATIONS_CANCEL | ADMIN_ACTION | keep permission |  |
| POST | /notifications/subscribe | subscribeToTopic | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| POST | /notifications/unsubscribe | unsubscribeFromTopic | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| POST | /notifications/validate-token | getUserNotifications | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /notifications/user/:userId/unread-count | getUnreadCount | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |
| PUT | /notifications/user/:userId/mark-read | markNotificationAsRead | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |
| PUT | /notifications/user/:userId/mark-all-read | markAllNotificationsAsRead | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /notifications/:notificationId/user/:userId | getNotificationDetails | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |

## backend/src\offres\offres.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /offres | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /offres/user | findAllByUser | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /offres/all | findAllAdmin | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /offres/:id/type-profils | getTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /offres/:id/type-profils | setTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /offres/:id | findOne | none | none | PUBLIC_READ | keep |  |
| POST | /offres | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PUT | /offres/:id | update | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PUT | /offres/:id/status | updateStatus | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /offres/:id | remove | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PATCH | /offres/:id/image-couverture | uploadImageCouverture | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /offres/:id/image-couverture | getImageCouverture | none | none | PUBLIC_READ | keep |  |

## backend/src\opportunites\opportunites.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /opportunites | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /opportunites | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /opportunites/:id/type-profils | getTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /opportunites/:id/type-profils | setTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /opportunites/:id/telechargement | downloadFile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /opportunites/:id/image | viewImage | none | none | PUBLIC_READ | keep |  |
| GET | /opportunites/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /opportunites/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /opportunites/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\parcours\parcours.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /parcours | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /parcours | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /parcours/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /parcours/:id | update | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| DELETE | /parcours/:id | remove | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /parcours/search/:term | search | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /parcours/:id/image | downloadImage | none | none | PUBLIC_READ | keep |  |
| GET | /parcours/:id/media | downloadMedia | none | none | PUBLIC_READ | keep |  |
| GET | /parcours/:id/lien | getLink | none | none | PUBLIC_READ | keep |  |
| GET | /parcours/:id/categorie/icon | getCategoryIcon | none | none | PUBLIC_READ | keep |  |

## backend/src\prestataires\prestataires.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /prestataires | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /prestataires | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /prestataires/profil | findProfile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /prestataires | update | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| DELETE | /prestataires/:id | remove | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PATCH | /prestataires/photo-profil | uploadPhotoProfil | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /prestataires/photo-profil | getPhotoProfil | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /prestataires/photo-identite | uploadPhotoIdentite | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /prestataires/photo-identite | getPhotoIdentite | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\publicites\publicites.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /publicites | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /publicites | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /publicites/:id/media | downloadMedia | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /publicites/:id/lien | getLink | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /publicites/:id/image | downloadImage | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /publicites/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /publicites/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /publicites/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\recruteurs\recruteurs.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /recruteurs | create | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /recruteurs | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /recruteurs/all | findAllAdmin | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /recruteurs/profil | findProfile | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /recruteurs | update | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PUT | /recruteurs/:id/status | updateStatus | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /recruteurs/:id | remove | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PATCH | /recruteurs/photo-profil | uploadPhotoProfil | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /recruteurs/photo-profil | getPhotoProfil | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PATCH | /recruteurs/photo-identite | uploadPhotoIdentite | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /recruteurs/photo-identite | getPhotoIdentite | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\series\series.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /series | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /series | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /series/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /series/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /series/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\services\services.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /services | create | JwtAuthGuard, RolesGuard; JwtAuthGuard, RolesGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /services | findAll | JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /services/:id/type-profils | getTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /services/:id/type-profils | setTypeProfils | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /services/user | findAllByUser | JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /services/all | findAllAdmin | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /services/:id/status | updateStatus | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /services/:id | findOne | JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /services/:id | update | JwtAuthGuard, RolesGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| DELETE | /services/:id | remove | JwtAuthGuard, RolesGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PATCH | /services/:id/image-couverture | uploadImageCouverture | JwtAuthGuard, RolesGuard; JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /services/:id/image-couverture | getImageCouverture | JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\structure\structure.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /structure | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /structure | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /structure/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /structure/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /structure/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\submissions-stats\submissions-stats.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /submissions/stats | getStats | JwtAuthGuard, PermissionsGuard | Permission.STATS_READ | ADMIN_ACTION | keep permission |  |

## backend/src\titre\titre.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /titre | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /titre | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /titre/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /titre/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /titre/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\type-profils\type-profils.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /type-profils | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /type-profils | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /type-profils/registry | getRegistry | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /type-profils/registry | setRegistry | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /type-profils/:uuid/entities | getEntities | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /type-profils/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /type-profils/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /type-profils/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\types-examen\types-examen.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /types-examen | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /types-examen | findAll | none | none | PUBLIC_READ | keep |  |
| GET | /types-examen/:id | findOne | none | none | PUBLIC_READ | keep |  |
| PATCH | /types-examen/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /types-examen/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\types\types.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /types | findAll | JwtAuthGuard, RolesGuard; JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /types/:id | findOne | JwtAuthGuard, RolesGuard | none | AUTHENTICATED_READ | keep |  |
| POST | /types | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| PUT | /types/:id | update | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /types/:id | remove | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\utilisateurs\utilisateurs.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /utilisateurs/inscription | inscription | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /utilisateurs | findAll | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /utilisateurs/appareils-partages | sharedDevices | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /utilisateurs/profil | getProfil | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| POST | /utilisateurs | create | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| POST | /utilisateurs/backfill-referral-codes | backfillReferralCodes | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| POST | /utilisateurs/backfill-uuids | backfillUuids | JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /utilisateurs/code-parrainage | getMyReferralCode | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /utilisateurs | updateProfile | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /utilisateurs/verify-email | verifyEmail | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| POST | /utilisateurs/validate-email | validateEmail | none | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| GET | /utilisateurs/is-email-verify | isEmailVerify | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /utilisateurs/is-prestataire | isPrestataire | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /utilisateurs/is-recruteur | isRecruteur | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /utilisateurs/:id | update | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /utilisateurs/:id | remove | JwtAuthGuard, OwnerOrAdminGuard | none | USER_OWN_RESOURCE | keep |  |
| DELETE | /utilisateurs | removeSelf | JwtAuthGuard | none | UNKNOWN_NEEDS_REVIEW | review: admin, owner, or public workflow | Manual decision required. |
| PATCH | /utilisateurs/me/update/fcm-token | updateMyFcmToken | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| PATCH | /utilisateurs/photo | uploadPhoto | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /utilisateurs/photo | getPhoto | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /utilisateurs/:uuid | getByUuid | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

## backend/src\villes\ville.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /villes | create | JwtAuthGuard; JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| POST | /villes/import-csv | importCsv | JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| GET | /villes | findAll | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /villes/:id | findOne | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| PUT | /villes/:id | update | JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |
| DELETE | /villes/:id | remove | JwtAuthGuard; JwtAuthGuard, RolesGuard | RoleType.ADMIN | ADMIN_ACTION | admin/permission |  |

## backend/src\wallet\internal\exam-reward-internal.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /internal/payment/exam-rewards/credit | credit | InternalApiKeyGuard | none | SYSTEM_INTERNAL | keep |  |

## backend/src\wallet\internal\reward-internal.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /internal/payment/rewards/credit | credit | InternalApiKeyGuard; InternalApiKeyGuard | none | SYSTEM_INTERNAL | keep |  |

## backend/src\wallet\otp\infobip-delivery-report.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /internal/otp/infobip/delivery-report | receiveDeliveryReport | InfobipWebhookGuard | none | SYSTEM_INTERNAL | keep |  |

## backend/src\wallet\user-payment\user-payment.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| POST | /user-payment/accounts | upsertAccount | JwtAuthGuard; JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /user-payment/accounts/me | myAccounts | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /user-payment/admin/withdrawals | adminWithdrawals | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_READ | ADMIN_ACTION | keep permission |  |
| GET | /user-payment/admin/withdrawals/:id/otp-delivery-status | getWithdrawalOtpDeliveryStatusDetails | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_READ | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/withdrawals/:id/approve | approve | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_APPROVE | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/withdrawals/:id/reject | reject | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_REJECT | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/withdrawals/:id/cancel | cancel | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_CANCEL | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/withdrawals/:id/unlock-otp | unlockOtp | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_UNLOCK_OTP | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/withdrawals/:id/confirm-payment | confirmPayment | JwtAuthGuard; PermissionsGuard | Permission.WALLET_WITHDRAWALS_CONFIRM_PAYMENT | ADMIN_ACTION | keep permission |  |
| GET | /user-payment/admin/users/:userId/payment-activity | getUserPaymentActivityDetails | JwtAuthGuard; PermissionsGuard | Permission.WALLET_READ | ADMIN_ACTION | keep permission |  |
| GET | /user-payment/admin/reward-configurations | listRewardConfigurationDetails | JwtAuthGuard; PermissionsGuard | Permission.WALLET_CONFIGURATION_UPDATE | ADMIN_ACTION | keep permission |  |
| GET | /user-payment/admin/reward-configurations/:sourceType | getRewardConfigurationDetails | JwtAuthGuard; PermissionsGuard | Permission.WALLET_CONFIGURATION_UPDATE | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/reward-configurations/:sourceType | updateRewardConfigurationDetails | JwtAuthGuard; PermissionsGuard | Permission.WALLET_CONFIGURATION_UPDATE | ADMIN_ACTION | keep permission |  |
| GET | /user-payment/admin/configuration | getPaymentConfiguration | JwtAuthGuard; PermissionsGuard | Permission.WALLET_READ | ADMIN_ACTION | keep permission |  |
| PATCH | /user-payment/admin/configuration | updatePaymentConfiguration | JwtAuthGuard; PermissionsGuard | Permission.WALLET_CONFIGURATION_UPDATE | ADMIN_ACTION | keep permission |  |

## backend/src\wallet\wallet-balance\wallet.controller.ts

| Method | Path | Handler | Current Guards | Current Roles/Permissions | Classification | Suggested Protection | Notes |
|---|---|---|---|---|---|---|---|
| GET | /wallet/me | getMine | JwtAuthGuard; JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /wallet/me/transactions | getMyTransactions | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /wallet/me/overview | getMyOverview | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| GET | /wallet/withdrawals/current | getCurrentWithdrawalStatus | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |
| POST | /wallet/withdrawals | createWithdrawal | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| POST | /wallet/withdrawals/:id/verify-otp | verifyOtp | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| POST | /wallet/withdrawals/:id/resend-otp | resendOtp | JwtAuthGuard | none | USER_OWN_RESOURCE | keep |  |
| GET | /wallet/dev/withdrawals/:id/otp | getOtpForDev | JwtAuthGuard | none | AUTHENTICATED_READ | keep |  |

# Summary

- Controllers scanned: 59
- Routes scanned: 382
- Admin/permission actions: 148
- Unknown routes requiring manual review: 43

## Routes A Corriger Ou Confirmer

| File | Method | Path | Handler | Current Guards | Suggested Protection | Reason |
|---|---|---|---|---|---|---|
| backend/src\auth\auth.controller.ts | POST | /auth/register | register | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\auth\auth.controller.ts | POST | /auth/connexion | login | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\auth\auth.controller.ts | POST | /auth/refresh | refresh | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\auth\auth.controller.ts | POST | /auth/forgot-password | forgotPassword | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\auth\auth.controller.ts | POST | /auth/reset-password | resetPassword | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\concours\concours-submissions.controller.ts | POST | /concours/submissions | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\epreuves\epreuves.controller.ts | POST | /epreuves | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\epreuves\epreuves.controller.ts | PUT | /epreuves/:id | update | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\epreuves\epreuves.controller.ts | DELETE | /epreuves/:id | remove | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\epreuves\submissions\epreuve-submissions.controller.ts | POST | /epreuves/submissions | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\fichiers\fichiers.controller.ts | POST | /fichiers | uploadFile | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\fichiers\fichiers.controller.ts | DELETE | /fichiers | deleteFile | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\files\files.controller.ts | POST | /files/:entity/:uuid/:slot/upload-url | createUploadUrl | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\files\files.controller.ts | POST | /files/:entity/:uuid/:slot/upload | proxyUpload | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\firebase\firebase.controller.ts | POST | /firebase | create | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\firebase\firebase.controller.ts | PATCH | /firebase/:id | update | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\firebase\firebase.controller.ts | DELETE | /firebase/:id | remove | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\forum\forum.controller.ts | POST | /forums | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\forum\forum.controller.ts | DELETE | /forums/:id | remove | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\forum\forum.controller.ts | PUT | /forums/:id | update | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\notification-email\notification-email.controller.ts | POST | /notification-email/unsubscribe | unsubscribe | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\offres\offres.controller.ts | POST | /offres | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\offres\offres.controller.ts | PUT | /offres/:id | update | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\offres\offres.controller.ts | DELETE | /offres/:id | remove | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\offres\offres.controller.ts | PATCH | /offres/:id/image-couverture | uploadImageCouverture | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\parcours\parcours.controller.ts | POST | /parcours | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\parcours\parcours.controller.ts | PATCH | /parcours/:id | update | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\parcours\parcours.controller.ts | DELETE | /parcours/:id | remove | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\prestataires\prestataires.controller.ts | POST | /prestataires | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\prestataires\prestataires.controller.ts | PUT | /prestataires | update | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\prestataires\prestataires.controller.ts | DELETE | /prestataires/:id | remove | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\recruteurs\recruteurs.controller.ts | POST | /recruteurs | create | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\recruteurs\recruteurs.controller.ts | PUT | /recruteurs | update | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\recruteurs\recruteurs.controller.ts | DELETE | /recruteurs/:id | remove | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\services\services.controller.ts | POST | /services | create | JwtAuthGuard, RolesGuard; JwtAuthGuard, RolesGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\services\services.controller.ts | PUT | /services/:id | update | JwtAuthGuard, RolesGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\services\services.controller.ts | DELETE | /services/:id | remove | JwtAuthGuard, RolesGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\services\services.controller.ts | PATCH | /services/:id/image-couverture | uploadImageCouverture | JwtAuthGuard, RolesGuard; JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\utilisateurs\utilisateurs.controller.ts | POST | /utilisateurs/inscription | inscription | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\utilisateurs\utilisateurs.controller.ts | PUT | /utilisateurs | updateProfile | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\utilisateurs\utilisateurs.controller.ts | POST | /utilisateurs/verify-email | verifyEmail | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\utilisateurs\utilisateurs.controller.ts | POST | /utilisateurs/validate-email | validateEmail | none | review: admin, owner, or public workflow | Manual decision required. |
| backend/src\utilisateurs\utilisateurs.controller.ts | DELETE | /utilisateurs | removeSelf | JwtAuthGuard | review: admin, owner, or public workflow | Manual decision required. |
