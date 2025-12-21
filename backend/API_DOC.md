# Documentation de l'API - Educ Prime

## Aperçu

Ce document décrit l'ensemble des points d'accès REST de la plateforme Educ Prime. 

**Important:** Tous les endpoints nécessitent une authentification JWT sauf indication contraire. Le jeton JWT doit être inclus dans l'en-tête `Authorization: Bearer <token>` de chaque requête. Pour obtenir un jeton, utilisez l'endpoint `/auth/connexion` ou créez un nouveau compte via `/utilisateurs/inscription`.

### Authentification et tokens
- **Access Token** : Valide pendant 1 heure, utilisé pour authentifier les requêtes API
- **Refresh Token** : Valide pendant 7 jours, utilisé pour obtenir un nouveau access token via `/auth/refresh`
- **Cycle de vie des tokens** :
  - Lorsque l'access token expire, l'API retourne une erreur 401 Unauthorized
  - Le client doit alors appeler `/auth/refresh` avec le refresh token pour obtenir un nouveau access token
  - Si le refresh token a expiré (après 7 jours), le client doit se reconnecter via `/auth/connexion`

### Rôles et permissions
- **admin** : Accès complet à tous les endpoints
- **professeur** : Peut créer/modifier/supprimer les matières, épreuves et ressources
- **étudiant** : Accès en lecture aux ressources académiques
- **autre** : Accès en lecture aux ressources académiques

### Pagination

Tous les endpoints qui retournent des listes supportent la pagination via les paramètres de requête `page` et `limit`.

**Paramètres de pagination:**
- `page` (optionnel, défaut: 1) : Numéro de la page à récupérer (minimum: 1)
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page (minimum: 1)

**Format de réponse paginée:**
```json
{
  "data": [...],           // Tableau des éléments de la page actuelle
  "total": 50,            // Nombre total d'éléments
  "page": 1,              // Page actuelle
  "limit": 10,            // Nombre d'éléments par page
  "totalPages": 5         // Nombre total de pages
}
```

**Exemple d'utilisation:**
```http
GET /epreuves?page=2&limit=20
Authorization: Bearer <token>
```

**Note:** Si les paramètres de pagination ne sont pas fournis, les valeurs par défaut (page=1, limit=10) sont utilisées.

## Points d'accès d'authentification

### Lister les utilisateurs - `GET /utilisateurs`
Obtenir la liste de tous les utilisateurs.

**Permissions requises:** Admin uniquement

```http
GET /utilisateurs
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
    {
        "id": 1,
        "email": "utilisateur@exemple.com",
        "nom": "Dupont",
        "prenom": "Jean",
        "pseudo": "jdupont",
        "role": "étudiant",
        "sexe": "M",
        "photo": "https://...",
        "telephone": "+33123456789",
        "etablissement_id": 1,
        "filiere_id": 1,
        "niveau_etude_id": 1
    }
]
```

### Obtenir son profil - `GET /utilisateurs/profil`
Obtenir les détails de l'utilisateur actuellement connecté (extrait du token JWT).

**Permissions requises:** Utilisateur authentifié

```http
GET /utilisateurs/profil
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "email": "utilisateur@exemple.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "pseudo": "jdupont",
    "role": "étudiant",
    "sexe": "M",
    "photo": "https://...",
    "telephone": "+33123456789",
    "etablissement_id": 1,
    "filiere_id": 1,
    "niveau_etude_id": 1
}
```

### Obtenir un utilisateur - `GET /utilisateurs/:id`
Obtenir les détails d'un utilisateur spécifique par son ID.

**Permissions requises:** Admin uniquement

```http
GET /utilisateurs/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "email": "utilisateur@exemple.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "pseudo": "jdupont",
    "role": "étudiant",
    "sexe": "M",
    "photo": "https://...",
    "telephone": "+33123456789",
    "etablissement_id": 1,
    "filiere_id": 1,
    "niveau_etude_id": 1
}
```

### Inscription - `POST /utilisateurs/inscription`
Créer un nouvel utilisateur.

**Authentification requise:** Non (endpoint public)

**Note:** Le mot de passe doit contenir au moins 8 caractères.

```http
POST /utilisateurs/inscription
Content-Type: application/json

{
    "email": "utilisateur@exemple.com",
    "mot_de_passe": "MotDePasse123!",  // Minimum 8 caractères
    "nom": "Dupont",
    "prenom": "Jean",
    "pseudo": "jdupont",                // Facultatif
    "role": "étudiant",                 // étudiant, professeur, admin, autre
    "sexe": "M",                        // M, F, Autre
    "photo": "https://...",             // Facultatif, URL vers la photo de profil
    "telephone": "+33123456789",        // Facultatif
    "etablissement_id": 1,              // Facultatif, doit être un nombre
    "filiere_id": 1,                    // Facultatif, doit être un nombre
    "niveau_etude_id": 1                // Facultatif, doit être un nombre
}
```
Response (201 Created):
```json
{
    "id": 1,
    "email": "utilisateur@exemple.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "pseudo": "jdupont",
    "role": "étudiant",
    "sexe": "M",
    "photo": "https://...",
    "telephone": "+33123456789",
    "etablissement_id": 1,
    "filiere_id": 1,
    "niveau_etude_id": 1
}
```

### Mettre à jour un utilisateur - `PUT /utilisateurs/:id`
Modifier un utilisateur existant.

**Permissions requises:** Propriétaire du compte ou Admin

**Champs disponibles:**
- `nom` (facultatif) : Nom de l'utilisateur
- `prenom` (facultatif) : Prénom de l'utilisateur
- `pseudo` (facultatif) : Pseudo de l'utilisateur
- `photo` (facultatif) : URL de la photo de profil
- `sexe` (facultatif) : Sexe (M, F, Autre)
- `telephone` (facultatif) : Numéro de téléphone
- `role` (facultatif) : Rôle (étudiant, professeur, admin, autre) - admin uniquement
- `etablissement_id` (facultatif) : ID de l'établissement (nombre)
- `filiere_id` (facultatif) : ID de la filière (nombre)
- `niveau_etude_id` (facultatif) : ID du niveau d'étude (nombre)

```http
PUT /utilisateurs/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "pseudo": "jean_dupont",
    "telephone": "+33987654321",
    "etablissement_id": 2
}
```
Response (200 OK):
```json
{
    "id": 1,
    "email": "utilisateur@exemple.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "pseudo": "jean_dupont",
    "role": "étudiant",
    "sexe": "M",
    "photo": "https://...",
    "telephone": "+33987654321",
    "etablissement_id": 2,
    "filiere_id": 1,
    "niveau_etude_id": 1
}
```

### Supprimer un utilisateur - `DELETE /utilisateurs/:id`
Supprimer un utilisateur.

**Permissions requises:** Propriétaire du compte ou Admin

```http
DELETE /utilisateurs/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Utilisateur supprimé avec succès"
}
```

### Connexion - `POST /auth/connexion`
Authentifier un utilisateur existant.

**Authentification requise:** Non (endpoint public)

**Notes:** 
- Le mot de passe doit contenir au moins 8 caractères.
- L'access token est valide pendant 1 heure.
- Le refresh token est valide pendant 7 jours.

```http
POST /auth/connexion
Content-Type: application/json

{
    "email": "utilisateur@exemple.com",
    "mot_de_passe": "MotDePasse123!",  // Minimum 8 caractères
    "appareil": "web"                   // Facultatif: "web" ou "mobile" (défaut: "web")
}
```
Response (200 OK):
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "a1b2c3d4e5f6..."
}
```

### Rafraîchir le token - `POST /auth/refresh`
Obtenir un nouveau access token en utilisant un refresh token valide.

**Authentification requise:** Non (utilise le refresh token)

**Notes:** 
- Appelez cet endpoint lorsque vous recevez une erreur 401 avec un access token expiré
- Si le refresh token a expiré (après 7 jours), l'endpoint retournera une erreur 401
- Le client doit gérer les requêtes concurrentes pour éviter les appels multiples simultanés

```http
POST /auth/refresh
Content-Type: application/json

{
    "refresh_token": "a1b2c3d4e5f6..."
}
```
Response (200 OK):
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```
Response (401 Unauthorized) - Token expiré:
```json
{
    "statusCode": 401,
    "message": "Refresh token expiré, veuillez vous reconnecter",
    "error": "Unauthorized"
}
```

### Déconnexion - `POST /auth/deconnexion`
Invalider la session en cours et révoquer tous les refresh tokens de l'utilisateur.

**Note:** Cette action révoque tous les refresh tokens de l'utilisateur sur tous les appareils.

```http
POST /auth/deconnexion
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Déconnexion réussie"
}
```

## Statistiques

### Obtenir les statistiques - `GET /stats`
Obtenir les statistiques globales de la plateforme (compteurs).

**Permissions requises:** Admin uniquement

**Note:** Cet endpoint utilise des requêtes SQL optimisées (`COUNT`) pour obtenir rapidement les statistiques sans charger toutes les données.

```http
GET /stats
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "usersCount": 42,
    "etablissementsCount": 11,
    "filieresCount": 21,
    "matieresCount": 251,
    "epreuvesCount": 0
}
```

Response (403 Forbidden) - Non-admin user:
```json
{
    "statusCode": 403,
    "message": "Forbidden resource",
    "error": "Forbidden"
}
```

## Structure académique

### Lister les établissements - `GET /etablissements`
Obtenir la liste de tous les établissements avec pagination.

**Permissions requises:** Utilisateur authentifié

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page
- `nom` (optionnel) : Filtrer par nom
- `ville` (optionnel) : Filtrer par ville

```http
GET /etablissements?page=1&limit=10&ville=Paris
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "nom": "Université de Paris",
            "adresse": "123 Rue de la Sorbonne",
            "ville": "Paris",
            "pays": "France",
            "logo": "https://storage.googleapis.com/..."
        }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
}
```

### Obtenir un établissement - `GET /etablissements/:id`
Obtenir les détails d'un établissement spécifique.
```http
GET /etablissements/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "Université Paris-Saclay",
    "ville": "Paris",
    "code_postal": "75000",
    "logo": "https://storage.googleapis.com/..."
}
```

### Télécharger le logo - `GET /etablissements/:id/logo`
Télécharger le logo associé à un établissement.

**Permissions requises:** Utilisateur authentifié

```http
GET /etablissements/1/logo
Authorization: Bearer <token>
```

Response (200 OK): Contenu binaire de l'image

En-têtes de réponse:
- `Content-Type`: Type MIME de l'image (ex: `image/png`)
- `Content-Disposition`: `attachment; filename="logo.png"`

Codes d'erreur possibles:
- `404 Not Found` – Établissement introuvable
- `400 Bad Request` – L'établissement n'a pas de logo associé

### Créer un établissement - `POST /etablissements`
Créer un nouvel établissement (admin uniquement).

**Champs disponibles:**
- `nom` (requis) : Nom de l'établissement
- `ville` (facultatif) : Ville de l'établissement
- `code_postal` (facultatif) : Code postal de l'établissement

```http
POST /etablissements
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Université Paris-Saclay",
    "ville": "Paris",               // Facultatif
    "code_postal": "75000"          // Facultatif
}
```
Response (201 Created):
```json
{
    "id": 1,
    "nom": "Université Paris-Saclay",
    "ville": "Paris",
    "code_postal": "75000"
}
```

### Mettre à jour un établissement - `PUT /etablissements/:id`
Modifier un établissement existant (admin uniquement).

**Champs disponibles:**
- `nom` (facultatif) : Nom de l'établissement
- `ville` (facultatif) : Ville de l'établissement
- `code_postal` (facultatif) : Code postal de l'établissement

```http
PUT /etablissements/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Université Paris-Saclay Updated",
    "ville": "Gif-sur-Yvette",
    "code_postal": "91190"
}
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "Université Paris-Saclay Updated",
    "ville": "Gif-sur-Yvette",
    "code_postal": "91190"
}
```

### Supprimer un établissement - `DELETE /etablissements/:id`
Supprimer un établissement (admin uniquement).
```http
DELETE /etablissements/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Établissement supprimé avec succès"
}
```

                "nom": "Informatique",
                "etablissement_id": 1
            }
        },
        {
            "id": 2,
            "nom": "Licence 2",
            "duree_mois": 12,
            "filiere": {
                "id": 2,
                "nom": "Informatique",
                "etablissement_id": 1
            }
        }
    ],
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1
}
```

### Lister les matières d'un niveau d'étude - `GET /etablissements/:id/filieres/:filiereId/niveau-etude/:niveauId/matieres`
Obtenir toutes les matières associées à un niveau d'étude spécifique avec pagination.

**Permissions requises:** Utilisateur authentifié

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page

```http
GET /etablissements/1/filieres/2/niveau-etude/3/matieres?page=1&limit=10
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "nom": "Algorithmique",
            "description": "Introduction aux algorithmes",
            "niveau_etude": {
                "id": 3,
                "nom": "Licence 1",
                "duree_mois": 12,
                "filiere": {
                    "id": 2,
                    "nom": "Informatique",
                    "etablissement_id": 1
                }
            }
        }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
}
```


### Lister les ressources d'un niveau d'étude - `GET /etablissements/:id/filieres/:filiereId/niveau-etude/:niveauId/ressources`
Obtenir toutes les ressources associées à un niveau d'étude avec filtrage optionnel.

**Permissions requises:** Utilisateur authentifié

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page
- `titre` (optionnel) : Filtrer par titre
- `type` (optionnel) : Filtrer par type (Document, Quiz, Exercices)
- `matiere` (optionnel) : Filtrer par nom de la matière

```http
GET /etablissements/1/filieres/2/niveau-etude/3/ressources?page=1&limit=10&type=Document
Authorization: Bearer <token>
```
Response (200 OK): Format identique à `GET /ressources` (réponse paginée)

### Lister les filières - `GET /filieres`
Obtenir la liste de toutes les filières.
```http
GET /filieres
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
    {
        "id": 1,
        "nom": "Informatique",
        "etablissement_id": 1
    }
]
```

### Obtenir une filière - `GET /filieres/:id`
Obtenir les détails d'une filière spécifique.
```http
GET /filieres/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "Informatique",
    "etablissement_id": 1
}
```

### Créer une filière - `POST /filieres`
Créer un nouveau programme.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `nom` (requis) : Nom de la filière
- `etablissement_id` (requis) : ID de l'établissement (nombre)

```http
POST /filieres
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Informatique",
    "etablissement_id": 1           // Doit être un nombre
}
```
Response (201 Created):
```json
{
    "id": 1,
    "nom": "Informatique",
    "etablissement_id": 1
}
```

### Mettre à jour une filière - `PUT /filieres/:id`
Modifier une filière existante.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `nom` (facultatif) : Nom de la filière
- `etablissement_id` (facultatif) : ID de l'établissement (nombre)

```http
PUT /filieres/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Informatique et Réseaux",
    "etablissement_id": 1
}
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "Informatique et Réseaux",
    "etablissement_id": 1
}
```

### Supprimer une filière - `DELETE /filieres/:id`
Supprimer une filière.

**Permissions requises:** Utilisateur authentifié

```http
DELETE /filieres/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Filière supprimée avec succès"
}
```

### Lister les niveaux d'étude - `GET /niveau-etude`
Obtenir la liste de tous les niveaux d'étude.
```http
GET /niveau-etude
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
    {
        "id": 1,
        "nom": "License 3",
        "duree_mois": 12,
        "filiere": {
            "id": 1,
            "nom": "Informatique",
            "etablissement_id": 1
        }
    }
]
```

### Obtenir un niveau d'étude - `GET /niveau-etude/:id`
Obtenir les détails d'un niveau d'étude spécifique.
```http
GET /niveau-etude/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "License 3",
    "duree_mois": 12,
    "filiere": {
        "id": 1,
        "nom": "Informatique",
        "etablissement_id": 1
    }
}
```

### Créer un niveau d'étude - `POST /niveau-etude`
Créer un nouveau niveau d'étude.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `nom` (requis) : Nom du niveau d'étude
- `duree_mois` (facultatif) : Durée en mois (nombre)
- `filiere_id` (requis) : ID de la filière (nombre)

```http
POST /niveau-etude
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "License 3",
    "duree_mois": 12,               // Facultatif, doit être un nombre
    "filiere_id": 1                 // Doit être un nombre
}
```
Response (201 Created):
```json
{
    "id": 1,
    "nom": "License 3",
    "duree_mois": 12,
    "filiere_id": 1
}
```

### Mettre à jour un niveau d'étude - `PUT /niveau-etude/:id`
Modifier un niveau d'étude existant.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `nom` (facultatif) : Nom du niveau d'étude
- `duree_mois` (facultatif) : Durée en mois (nombre)
- `filiere_id` (facultatif) : ID de la filière (nombre)

```http
PUT /niveau-etude/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "License 3 - Semestre 1",
    "duree_mois": 6,
    "filiere_id": 1
}
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "License 3 - Semestre 1",
    "duree_mois": 6,
    "filiere_id": 1
}
```

### Supprimer un niveau d'étude - `DELETE /niveau-etude/:id`
Supprimer un niveau d'étude.

**Permissions requises:** Utilisateur authentifié

```http
DELETE /niveau-etude/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Niveau d'étude supprimé avec succès"
}
```

## Gestion de contenu

### Lister les matières - `GET /matieres`
Obtenir la liste de toutes les matières.
```http
GET /matieres
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
    {
        "id": 1,
        "nom": "Algorithmique",
        "description": "Introduction aux algorithmes",
        "niveau_etude": {
            "id": 1,
            "nom": "License 3",
            "duree_mois": 12,
            "filiere": {
                "id": 1,
                "nom": "Informatique",
                "etablissement_id": 1
            }
        }
    }
]
```

### Obtenir une matière - `GET /matieres/:id`
Obtenir les détails d'une matière spécifique.
```http
GET /matieres/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "Algorithmique",
    "description": "Introduction aux algorithmes",
    "niveau_etude": {
        "id": 1,
        "nom": "License 3",
        "duree_mois": 12,
        "filiere": {
            "id": 1,
            "nom": "Informatique",
            "etablissement_id": 1
        }
    }
}
```

### Créer une matière - `POST /matieres`
Créer une nouvelle matière.

**Permissions requises:** Admin ou Professeur

**Champs disponibles:**
- `nom` (requis) : Nom de la matière
- `description` (facultatif) : Description de la matière
- `niveau_etude_id` (requis) : ID du niveau d'étude (nombre)
- `filiere_id` (requis) : ID de la filière (nombre)

```http
POST /matieres
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Algorithmique",
    "description": "Introduction aux algorithmes",  // Facultatif
    "niveau_etude_id": 1,                          // Doit être un nombre
    "filiere_id": 1                                // Doit être un nombre
}
```
Response (201 Created):
```json
{
    "id": 1,
    "nom": "Algorithmique",
    "description": "Introduction aux algorithmes",
    "niveau_etude_id": 1,
    "filiere_id": 1
}
```

### Mettre à jour une matière - `PUT /matieres/:id`
Modifier une matière existante.

**Permissions requises:** Admin ou Professeur

**Champs disponibles:**
- `nom` (facultatif) : Nom de la matière
- `description` (facultatif) : Description de la matière
- `niveau_etude_id` (facultatif) : ID du niveau d'étude (nombre)
- `filiere_id` (facultatif) : ID de la filière (nombre)

```http
PUT /matieres/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Algorithmique Avancée",
    "description": "Algorithmes avancés et structures de données",
    "niveau_etude_id": 1,
    "filiere_id": 1
}
```
Response (200 OK):
```json
{
    "id": 1,
    "nom": "Algorithmique Avancée",
    "description": "Algorithmes avancés et structures de données",
    "niveau_etude_id": 1,
    "filiere_id": 1
}
```

### Supprimer une matière - `DELETE /matieres/:id`
Supprimer une matière.

**Permissions requises:** Admin ou Professeur

```http
DELETE /matieres/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Matière supprimée avec succès"
}
```

### Lister les épreuves - `GET /epreuves`
Obtenir la liste de toutes les épreuves avec pagination et filtres optionnels.

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page
- `titre` (optionnel) : Filtrer par titre (recherche partielle)
- `type` (optionnel) : Filtrer par type (`Interrogation`, `Devoirs`, `Concours`, `Examens`)
- `matiere` (optionnel) : Filtrer par nom de la matière

```http
GET /epreuves?page=1&limit=10&titre=math&type=Examens
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "titre": "Épreuve de Mathématiques",
            "url": "https://exemple.com/fichier.pdf",
            "duree_minutes": 120,
            "date_creation": "2024-03-20T10:00:00Z",
            "date_publication": "2024-03-21T08:00:00Z",
            "nombre_pages": 5,
            "nombre_telechargements": 12,
            "type": "Examens",
            "professeur": {
                "nom": "Dupont",
                "prenom": "Jean",
                "telephone": "+33612345678"
            },
            "matiere": {
                "id": 1,
                "nom": "Mathématiques",
                "description": "Cours de mathématiques niveau lycée",
                "niveau_etude": {
                    "id": 1,
                    "nom": "Terminale C",
                    "duree_mois": 9,
                    "filiere": {
                        "id": 1,
                        "nom": "Enseignement Général",
                        "etablissement_id": 1
                    }
                }
            }
        }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
}
```

### Télécharger une épreuve - `GET /epreuves/:id/telechargement`
Télécharger le fichier associé à une épreuve.

**Permissions requises:** Utilisateur authentifié

```http
GET /epreuves/1/telechargement
Authorization: Bearer <token>
```

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `application/pdf`)
- `Content-Disposition`: `attachment; filename="exam.pdf"`

Codes d'erreur possibles:
- `404 Not Found` – Épreuve introuvable
- `400 Bad Request` – L'épreuve n'a pas de fichier associé

### Obtenir une épreuve - `GET /epreuves/:id`
Obtenir les détails d'une épreuve spécifique.
```http
GET /epreuves/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "titre": "Examen Final",
    "url": "https://exemple.com/exam.pdf",
    "duree_minutes": 180,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-01T14:00:00Z",
    "professeur": {
        "nom": "Dupont",
        "prenom": "Jean",
        "telephone": "+33123456789"
    },
    "matiere": {
        "id": 1,
        "nom": "Algorithmique",
        "description": "Introduction aux algorithmes",
        "niveau_etude": {
            "id": 1,
            "nom": "License 3",
            "duree_mois": 12,
            "filiere": {
                "id": 1,
                "nom": "Informatique",
                "etablissement_id": 1
            }
        }
    }
}
```

### Créer une épreuve - `POST /epreuves`
Créer une nouvelle épreuve.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `titre` (requis) : Titre de l'épreuve
- `url` (requis) : URL du fichier de l'épreuve
- `duree_minutes` (requis) : Durée de l'épreuve en minutes (nombre)
- `matiere_id` (requis) : ID de la matière (nombre)
- `date_publication` (facultatif) : Date de publication future (format ISO 8601)
- `nombre_pages` (facultatif) : Nombre de pages (nombre)
- `type` (facultatif) : Type d'épreuve (valeurs: `Interrogation`, `Devoirs`, `Concours`, `Examens`)

```http
POST /epreuves
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Examen Final",
    "url": "https://exemple.com/exam.pdf",
    "duree_minutes": 180,                        // Doit être un nombre
    "matiere_id": 1,                             // Doit être un nombre
    "date_publication": "2025-12-01T14:00:00Z",   // Facultatif, format date ISO 8601
    "nombre_pages": 5,                           // Facultatif
    "type": "Examens"                            // Facultatif
}
```
Response (201 Created):
```json
{
    "id": 1,
    "titre": "Examen Final",
    "url": "https://exemple.com/exam.pdf",
    "matiere_id": 1,
    "professeur_id": 2,
    "duree_minutes": 180,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-01T14:00:00Z"
}
```

### Mettre à jour une épreuve - `PUT /epreuves/:id`
Modifier une épreuve existante.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `titre` (facultatif) : Titre de l'épreuve
- `url` (facultatif) : URL du fichier de l'épreuve
- `duree_minutes` (facultatif) : Durée de l'épreuve en minutes (nombre)
- `matiere_id` (facultatif) : ID de la matière (nombre)
- `date_publication` (facultatif) : Date de publication future (format ISO 8601)
- `nombre_pages` (facultatif) : Nombre de pages (nombre)
- `type` (facultatif) : Type d'épreuve (valeurs: `Interrogation`, `Devoirs`, `Concours`, `Examens`)

```http
PUT /epreuves/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Examen Final - Session 2",
    "duree_minutes": 240,
    "date_publication": "2025-12-15T14:00:00Z"
}
```
Response (200 OK):
```json
{
    "id": 1,
    "titre": "Examen Final - Session 2",
    "url": "https://exemple.com/exam.pdf",
    "matiere_id": 1,
    "professeur_id": 2,
    "duree_minutes": 240,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-15T14:00:00Z"
}
```

### Supprimer une épreuve - `DELETE /epreuves/:id`
Supprimer une épreuve.

**Permissions requises:** Utilisateur authentifié

```http
DELETE /epreuves/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Épreuve supprimée avec succès"
}
```

### Lister les ressources - `GET /ressources`
Obtenir la liste de toutes les ressources avec pagination.

**Note de sécurité:** Les informations du professeur sont limitées au nom, prénom et téléphone uniquement. Les données sensibles (email, mot de passe, etc.) ne sont jamais exposées dans les réponses API.

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page
- `titre` (optionnel) : Filtrer par titre de la ressource
- `type` (optionnel) : Filtrer par type (Document, Quiz, Exercices)
- `matiere` (optionnel) : Filtrer par nom de la matière

```http
GET /ressources?page=1&limit=10&type=Document
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "titre": "Support de cours",
            "type": "Document",
            "url": "https://exemple.com/support.pdf",
            "nombre_pages": 15,
            "nombre_telechargements": 102,
            "date_creation": "2025-11-09T10:30:00Z",
            "date_publication": "2025-12-01T14:00:00Z",
            "professeur": {
                "nom": "Dupont",
                "prenom": "Jean",
                "telephone": "+33123456789"
            },
            "matiere": {
                "id": 1,
                "nom": "Algorithmique",
                "description": "Introduction aux algorithmes",
                "niveau_etude": {
                    "id": 1,
                    "nom": "License 3",
                    "duree_mois": 12,
                    "filiere": {
                        "id": 1,
                        "nom": "Informatique",
                        "etablissement_id": 1
                    }
                }
            }
        }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
}
```

### Télécharger une ressource - `GET /ressources/:id/telechargement`
Télécharger le fichier associé à une ressource.

**Permissions requises:** Utilisateur authentifié

```http
GET /ressources/1/telechargement
Authorization: Bearer <token>
```

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `application/pdf`)
- `Content-Disposition`: `attachment; filename="support.pdf"`

Codes d'erreur possibles:
- `404 Not Found` – Ressource introuvable
- `400 Bad Request` – La ressource n'a pas de fichier associé


### Obtenir une ressource - `GET /ressources/:id`
Obtenir les détails d'une ressource spécifique.
```http
GET /ressources/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "titre": "Support de cours",
    "type": "Document",
    "url": "https://exemple.com/support.pdf",
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-01T14:00:00Z",
    "professeur": {
        "nom": "Dupont",
        "prenom": "Jean",
        "telephone": "+33123456789"
    },
    "matiere": {
        "id": 1,
        "nom": "Algorithmique",
        "description": "Introduction aux algorithmes",
        "niveau_etude": {
            "id": 1,
            "nom": "License 3",
            "duree_mois": 12,
            "filiere": {
                "id": 1,
                "nom": "Informatique",
                "etablissement_id": 1
            }
        }
    }
}
```

### Créer une ressource - `POST /ressources`
Créer une nouvelle ressource.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `titre` (requis) : Titre de la ressource
- `type` (requis) : Type de ressource (valeurs acceptées : `Document`, `Quiz`, `Exercices`)
- `url` (requis) : URL du fichier de la ressource
- `matiere_id` (requis) : ID de la matière (nombre)
- `nombre_pages` (facultatif) : Nombre de pages (nombre)
- `date_publication` (facultatif) : Date de publication future (format ISO 8601)

```http
POST /ressources
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Support de cours",
    "type": "Document",                          // Document, Quiz, ou Exercices
    "url": "https://exemple.com/support.pdf",
    "matiere_id": 1,                             // Doit être un nombre
    "nombre_pages": 15,                          // Facultatif
    "date_publication": "2025-12-01T14:00:00Z"   // Facultatif, format date ISO 8601
}
```
Response (201 Created):
```json
{
    "id": 1,
    "titre": "Support de cours",
    "type": "Document",
    "url": "https://exemple.com/support.pdf",
    "matiere_id": 1,
    "professeur_id": 2,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-01T14:00:00Z"
}
```

### Mettre à jour une ressource - `PUT /ressources/:id`
Modifier une ressource existante.

**Permissions requises:** Utilisateur authentifié

**Champs disponibles:**
- `titre` (facultatif) : Titre de la ressource
- `type` (facultatif) : Type de ressource (valeurs acceptées : `Document`, `Quiz`, `Exercices`)
- `url` (facultatif) : URL du fichier de la ressource
- `matiere_id` (facultatif) : ID de la matière (nombre)
- `nombre_pages` (facultatif) : Nombre de pages (nombre)
- `date_publication` (facultatif) : Date de publication future (format ISO 8601)

```http
PUT /ressources/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Support de cours - Version 2",
    "type": "Document",
    "nombre_pages": 20,
    "date_publication": "2025-12-10T14:00:00Z"
}
```
Response (200 OK):
```json
{
    "id": 1,
    "titre": "Support de cours - Version 2",
    "type": "Document",
    "url": "https://exemple.com/support.pdf",
    "matiere_id": 1,
    "professeur_id": 2,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-10T14:00:00Z"
}
```

### Supprimer une ressource - `DELETE /ressources/:id`
Supprimer une ressource.

**Permissions requises:** Utilisateur authentifié

```http
DELETE /ressources/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "message": "Ressource supprimée avec succès"
}
```

## Gestion des fichiers

### Envoyer un fichier - `POST /fichiers`
Télécharger un fichier vers Firebase Storage et mettre à jour l'entité associée (épreuve ou ressource).

**Remarques importantes :**
- L'URL du fichier est automatiquement enregistrée dans la table `epreuves` ou `ressources`.
- Si l'entité n'existe pas, elle est créée automatiquement.
- En cas d'échec du téléversement, toute entité nouvellement créée est annulée (rollback).
- Les chemins générés dans Firebase sont normalisés en minuscules (ex. `ressources/document/...`).
- Le champ `typeRessource` est sensible à la casse et doit valoir `Document`, `Quiz` ou `Exercices`.
- Le champ `type` doit être en minuscules : `profile`, `epreuve`, ou `ressource`.
- **IMPORTANT** : Avec `multipart/form-data`, tous les champs sont envoyés comme des **strings**. Le backend les convertira automatiquement en nombres si nécessaire.

```http
POST /fichiers
Authorization: Bearer <token>
Content-Type: multipart/form-data

// Pour créer une nouvelle épreuve avec un fichier :
file: <file-data>
type: "epreuve"
matiereId: "1"                    // String (sera converti en number par le backend)
epreuveTitre: "Examen Final"
dureeMinutes: "180"               // String (sera converti en number par le backend)

// Pour ajouter un fichier à une épreuve existante :
file: <file-data>
type: "epreuve"
matiereId: "1"                    // String
epreuveId: "1"                    // String

// Pour créer une nouvelle ressource avec un fichier :
file: <file-data>
type: "ressource"
typeRessource: "Document"         // Valeurs: "Document", "Quiz", "Exercices"
matiereId: "1"                    // String
ressourceTitre: "Support de cours"

// Pour ajouter un fichier à une ressource existante :
file: <file-data>
type: "ressource"
typeRessource: "Document"
matiereId: "1"                    // String
ressourceId: "1"                  // String

// Pour télécharger une photo de profil :
file: <file-data>
type: "profile"
```

**Exemple avec curl - Créer une épreuve :**
```bash
curl -X POST http://localhost:3000/fichiers \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@/path/to/exam.pdf" \
  -F "type=epreuve" \
  -F "matiereId=1" \
  -F "epreuveTitre=Examen Final Informatique" \
  -F "dureeMinutes=120"
```

**Exemple avec curl - Créer une ressource :**
```bash
curl -X POST http://localhost:3000/fichiers \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@/path/to/cours.pdf" \
  -F "type=ressource" \
  -F "typeRessource=Document" \
  -F "matiereId=1" \
  -F "ressourceTitre=Cours Chapitre 1"
```

Réponse (201 Created) - Nouvelle épreuve créée :
```json
{
    "id": 1,
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/epreuves/1/1/exam.pdf",
    "filename": "epreuves/1/1/exam.pdf",
    "originalName": "exam.pdf"
}
```

Réponse (201 Created) - Nouvelle ressource créée :
```json
{
    "id": 1,
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/ressources/document/1/1/cours.pdf",
    "filename": "ressources/document/1/1/cours.pdf",
    "originalName": "cours.pdf"
}
```

Réponse (201 Created) - Photo de profil :
```json
{
    "id": 2,
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/utilisateurs/2/profile.jpg",
    "filename": "utilisateurs/2/profile.jpg",
    "originalName": "profile.jpg"
}
```

### Télécharger un fichier - `GET /fichiers/telechargement`
Récupérer un fichier depuis Firebase Storage en fournissant son URL.

```http
GET /fichiers/telechargement?url=<encoded-file-url>
Authorization: Bearer <token>
```

Exemple :
```http
GET /fichiers/telechargement?url=https%3A%2F%2Fstorage.googleapis.com%2Feduc-prime.firebasestorage.app%2Fepreuves%2F1%2F1%2Fexam.pdf
Authorization: Bearer <token>
```

Réponse (200 OK) : contenu binaire du fichier.

En-têtes de réponse :
- `Content-Type` : type MIME du fichier (par ex. `application/pdf`, `image/jpeg`).
- `Content-Disposition` : `attachment; filename="exam.pdf"`.

Codes d'erreur possibles :
- `400 Bad Request` – URL Firebase invalide.
- `404 Not Found` – Fichier introuvable dans le stockage.

## Points d'accès Publicités

### Lister les publicités - `GET /publicites`
Obtenir la liste des publicités avec pagination et filtrage.

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page
- `titre` (optionnel) : Filtrer par titre (recherche partielle)

```http
GET /publicites?page=1&limit=10&titre=Promo
Authorization: Bearer <token>
```

Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "titre": "Publicité 1",
            "image": "https://storage.googleapis.com/...",
            "media": "https://promo.com/video.mp4",
            "type_media": "Video",
            "ordre": 1,
            "actif": true
        }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
}
```

### Télécharger le média publicitaire - `GET /publicites/:id/media`
Télécharger le fichier média (vidéo ou image principale) associé à une publicité.

```http
GET /publicites/1/media
```

### Télécharger l'image de couverture - `GET /publicites/:id/image`
Télécharger l'image de couverture associée à une publicité.

```http
GET /publicites/1/image
```

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `image/jpeg`, `video/mp4`)
- `Content-Disposition`: `attachment; filename="banner.jpg"`

Codes d'erreur possibles:
- `404 Not Found` – Publicité introuvable
- `400 Bad Request` – La publicité n'a pas de fichier associé

### Obtenir une publicité - `GET /publicites/:id`
Obtenir les détails d'une publicité spécifique (accès public).

```http
GET /publicites/1
Authorization: Bearer <token>
```
Response (200 OK):
```json
{
    "id": 1,
    "titre": "Nouvelle formation disponible",
    "image": "https://storage.googleapis.com/...",
    "media": "https://exemple.com/formation.mp4",
    "type_media": "Video",
    "ordre": 1,
    "actif": true,
    "date_creation": "2025-12-06T01:00:00Z"
}
```

### Créer une publicité - `POST /publicites`
Créer une nouvelle publicité (admin uniquement).

**Permissions requises:** Admin uniquement

```http
POST /publicites
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Nouvelle Publicité",
    "image": "https://storage.googleapis.com/...",
    "media": "https://example.com/video.mp4",
    "type_media": "Video",
    "ordre": 1,
    "actif": true
}
```

**Types de média valides:** `"Image"`, `"Video"`

### Modifier une publicité - `PUT /publicites/:id`
Modifier une publicité existante (admin uniquement).

**Permissions requises:** Admin uniquement

```http
PUT /publicites/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Formation mise à jour",
    "actif": false
}
```

### Supprimer une publicité - `DELETE /publicites/:id`
Supprimer une publicité (admin uniquement).

**Permissions requises:** Admin uniquement

```http
DELETE /publicites/1
Authorization: Bearer <token>
```

---

## Points d'accès Événements

### Lister les événements - `GET /evenements`
Obtenir la liste de tous les événements avec pagination (accès public).

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page

```http
GET /evenements?page=1&limit=10
```
Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "titre": "Journée Portes Ouvertes",
            "description": "Venez découvrir notre établissement",
            "date_heure": "2025-12-15T14:00:00Z",
            "lieu": "Campus Principal",
            "lien_inscription": "https://exemple.com/inscription",
            "image": "https://storage.googleapis.com/bucket/evenements/1/event.jpg",
            "actif": true,
            "date_creation": "2025-12-06T01:00:00Z"
        }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
}
```

### Télécharger une image d'événement - `GET /evenements/:id/telechargement`
Télécharger l'image associée à un événement (accès public).

```http
GET /evenements/1/telechargement
```

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `image/jpeg`)
- `Content-Disposition`: `attachment; filename="event.jpg"`

Codes d'erreur possibles:
- `404 Not Found` – Événement introuvable
- `400 Bad Request` – L'événement n'a pas de fichier associé

### Obtenir un événement - `GET /evenements/:id`
Obtenir les détails d'un événement spécifique (accès public).

```http
GET /evenements/1
```

### Créer un événement - `POST /evenements`
Créer un nouvel événement (admin uniquement).

**Permissions requises:** Admin uniquement

**Note:** L'image doit d'abord être uploadée via `/fichiers` avec `type: "evenement"`.

```http
POST /evenements
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Journée Portes Ouvertes",
    "description": "Venez découvrir notre établissement",
    "date_heure": "2025-12-15T14:00:00Z",
    "lieu": "Campus Principal",
    "lien_inscription": "https://exemple.com/inscription",
    "image": "https://storage.googleapis.com/bucket/evenements/1/event.jpg",
    "actif": true
}
```

### Modifier un événement - `PUT /evenements/:id`
Modifier un événement existant (admin uniquement).

**Permissions requises:** Admin uniquement

```http
PUT /evenements/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Événement mis à jour",
    "actif": false
}
```

### Supprimer un événement - `DELETE /evenements/:id`
Supprimer un événement (admin uniquement).

**Permissions requises:** Admin uniquement

---

## Points d'accès Opportunités

### Récupérer les opportunités
`GET /opportunites`

**Paramètres de requête :**
- `page` (number, optionnel): Numéro de la page (défaut: 1).
- `limit` (number, optionnel): Nombre d'éléments par page (défaut: 10).
- `titre` (string, optionnel): Filtrer par titre (recherche partielle).
- `type` (string, optionnel): Filtrer par type ('Bourses' ou 'Stages').
- `lieu` (string, optionnel): Filtrer par lieu (recherche partielle).
- `organisme` (string, optionnel): Filtrer par organisme (recherche partielle).

**Réponse (200 OK) :**
```json
{
  "data": [
    {
      "id": 1,
      "titre": "Bourse d'étude au Canada",
      "type": "Bourses",
      "organisme": "Université de Montréal",
      "lieu": "Canada",
      "date_limite": "2023-12-31",
      "image": "https://example.com/image.jpg",
      "lien_postuler": "https://university.ca/apply",
      "actif": true,
      "date_creation": "2023-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Télécharger une image d'opportunité - `GET /opportunites/:id/telechargement`
Télécharger l'image associée à une opportunité (accès public).

```http
GET /opportunites/1/telechargement
```

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `image/jpeg`)
- `Content-Disposition`: `attachment; filename="image.jpg"`

Codes d'erreur possibles:
- `404 Not Found` – Opportunité introuvable
- `400 Bad Request` – L'opportunité n'a pas de fichier associé

### Lister les opportunités par type - `GET /opportunites/type/:type`
Obtenir la liste des opportunités filtrées par type avec pagination (accès public).

**Types valides:** `Bourses`, `Stages`

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page

```http
GET /opportunites/type/Bourses?page=1&limit=10
```

Response (200 OK): Format identique à `GET /opportunites` (réponse paginée)

### Obtenir une opportunité - `GET /opportunites/:id`
Obtenir les détails d'une opportunité spécifique (accès public).

```http
GET /opportunites/1
```

### Créer une opportunité - `POST /opportunites`
Créer une nouvelle opportunité (admin uniquement).

**Permissions requises:** Admin uniquement

**Note:** L'image doit d'abord être uploadée via `/fichiers` avec `type: "opportunite"`.

```http
POST /opportunites
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Bourse d'excellence",
    "type": "Bourses",
    "organisme": "Fondation XYZ",
    "pays": "France",
    "date_limite": "2025-12-31",
    "image": "https://storage.googleapis.com/bucket/opportunites/bourses/1/image.jpg",
    "lien_postuler": "https://exemple.com/postuler",
    "actif": true
}
```

**Types valides:** `"Bourses"`, `"Stages"`

### Modifier une opportunité - `PUT /opportunites/:id`
Modifier une opportunité existante (admin uniquement).

**Permissions requises:** Admin uniquement

```http
PUT /opportunites/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Opportunité mise à jour",
    "actif": false
}
```

### Supprimer une opportunité - `DELETE /opportunites/:id`
Supprimer une opportunité (admin uniquement).

**Permissions requises:** Admin uniquement

---

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `application/pdf`)
- `Content-Disposition`: `attachment; filename="annales.pdf"`

Codes d'erreur possibles:
- `404 Not Found` – Concours/examen introuvable
- `400 Bad Request` – Le concours/examen n'a pas de fichier associé

## Concours

### Lister les concours - `GET /concours`
Obtenir la liste de tous les concours avec filtrage et pagination.

**Paramètres de requête:**
- `page` (optionnel, défaut: 1) : Numéro de la page
- `limit` (optionnel, défaut: 10) : Nombre d'éléments par page
- `titre` (optionnel) : Filtrer par titre (recherche partielle)
- `lieu` (optionnel) : Filtrer par lieu (recherche partielle)
- `annee` (optionnel) : Filtrer par année (nombre exact)

```http
GET /concours?page=1&limit=10&lieu=Paris
Authorization: Bearer <token>
```

Response (200 OK):
```json
{
    "data": [
        {
            "id": 1,
            "titre": "Concours d'entrée 2026",
            "annee": 2026,
            "lieu": "Paris",
            "url": "https://storage.googleapis.com/...",
            "nombre_page": 10,
            "nombre_telechargements": 0
        }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
}
```

### Lister les années - `GET /concours/annee`
Obtenir la liste unique des années disponibles.
Note: `/concours/annees` est également disponible comme alias.

```http
GET /concours/annee
Authorization: Bearer <token>
```

Response (200 OK):
```json
[2024, 2025, 2026]
```

### Obtenir un concours - `GET /concours/:id`
Obtenir les détails d'un concours spécifique.

```http
GET /concours/1
Authorization: Bearer <token>
```

Response (200 OK):
```json
{
    "id": 1,
    "titre": "Concours d'entrée 2026",
    "annee": 2026,
    "lieu": "Paris",
    "url": "https://storage.googleapis.com/...",
    "nombre_page": 10,
    "nombre_telechargements": 5
}
```


### Télécharger un concours - `GET /concours/:id/telechargement`
Télécharger le fichier associé à un concours.

```http
GET /concours/1/telechargement
Authorization: Bearer <token>
```

Response (200 OK): Contenu binaire du fichier

En-têtes de réponse:
- `Content-Type`: Type MIME du fichier (ex: `application/pdf`)
- `Content-Disposition`: `attachment; filename="concours.pdf"`

Codes d'erreur possibles:
- `404 Not Found` – Concours introuvable
- `400 Bad Request` – Le concours n'a pas de fichier associé

### Créer un concours - `POST /concours`
Créer un nouveau concours (admin uniquement).

**Permissions requises:** Admin uniquement

```http
POST /concours
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Concours d'entrée 2026",
    "annee": 2026,
    "lieu": "Paris",
    "url": "https://storage.googleapis.com/...",
    "nombre_page": 12
}
```

Response (201 Created):
```json
{
    "id": 1,
    "titre": "Concours d'entrée 2026",
    "annee": 2026,
    "lieu": "Paris",
    "url": "https://storage.googleapis.com/...",
    "nombre_page": 12,
    "nombre_telechargements": 0
}
```

### Modifier un concours - `PUT /concours/:id`
Modifier un concours existant (admin uniquement).

**Permissions requises:** Admin uniquement

```http
PUT /concours/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Concours mis à jour",
    "nombre_page": 15
}
```

### Supprimer un concours - `DELETE /concours/:id`
Supprimer un concours (admin uniquement).

**Permissions requises:** Admin uniquement

```http
DELETE /concours/1
Authorization: Bearer <token>
```

Response (200 OK):
```json
{
    "message": "Concours supprimé avec succès"
}
```


---

## Upload de fichiers

### Upload d'image pour modules publics - `POST /fichiers`
Uploader une image pour les modules de contenu public (Publicités, Événements, Opportunités, Concours/Examens).

**Permissions requises:** Admin uniquement

**Important:** 
- L'entité (publicité, événement, etc.) doit être créée AVANT l'upload
- Le fichier sera stocké dans Firebase Storage avec un chemin organisé par type et ID d'entité
- L'URL retournée doit ensuite être utilisée pour mettre à jour l'entité

**Chemins de stockage:**
- Publicités: `/publicites/{publicite_id}/{filename}`
- Événements: `/evenements/{evenement_id}/{filename}`
- Opportunités: `/opportunites/{bourses|stages}/{opportunite_id}/{filename}`
- Concours/Examens: `/concours-examens/{concours|examens}/{concours_examen_id}/{filename}`

```http
POST /fichiers
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [fichier binaire]
type: "PUBLICITE" | "EVENEMENT" | "OPPORTUNITE" | "CONCOURS_EXAMEN"
entityId: 123
entitySubtype: "bourses" | "stages" | "concours" | "examens"  // Requis pour OPPORTUNITE et CONCOURS_EXAMEN
```

**Paramètres:**
- `file` (requis) : Le fichier à uploader (image ou vidéo pour PUBLICITE, image pour les autres)
- `type` (requis) : Type de contenu (`PUBLICITE`, `EVENEMENT`, `OPPORTUNITE`, `CONCOURS_EXAMEN`)
- `entityId` (requis) : ID de l'entité créée
- `entitySubtype` (facultatif) : Sous-type pour Opportunités (`bourses`/`stages`) et Concours/Examens (`concours`/`examens`)

**Exemple pour une publicité:**
```http
POST /fichiers
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: banner.jpg
type: PUBLICITE
entityId: 5
```

**Exemple pour une opportunité (bourse):**
```http
POST /fichiers
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: bourse.jpg
type: OPPORTUNITE
entityId: 12
entitySubtype: bourses
```

Response (200 OK):
```json
{
    "url": "https://storage.googleapis.com/bucket/publicites/5/banner.jpg"
}
```

**Flux complet de création avec image:**
1. Créer l'entité via `POST /publicites` (ou autre module) sans image
2. Uploader le fichier via `POST /fichiers` avec l'ID de l'entité créée
3. Mettre à jour l'entité via `PUT /publicites/:id` avec l'URL retournée

**Note:** Si l'upload échoue après la création de l'entité, le frontend supprime automatiquement l'entité créée (rollback).

---

## Points d'accès Contacts Professionnels

### Lister les contacts professionnels - `GET /contacts-professionnels`
Obtenir la liste de tous les contacts professionnels (accès public).

```http
GET /contacts-professionnels
```
Response (200 OK):
```json
[
    {
        "id": 1,
        "nom": "Dupont",
        "email": "contact@exemple.com",
        "telephone": "+33123456789",
        "message": "Demande de renseignements",
        "reseaux_sociaux": {
            "linkedin": "https://linkedin.com/in/dupont",
            "twitter": "@dupont"
        },
        "actif": true,
        "date_creation": "2025-12-06T01:00:00Z"
    }
]
```

### Obtenir un contact professionnel - `GET /contacts-professionnels/:id`
Obtenir les détails d'un contact professionnel spécifique (accès public).

```http
GET /contacts-professionnels/1
```

### Créer un contact professionnel - `POST /contacts-professionnels`
Créer un nouveau contact professionnel (admin uniquement).

**Permissions requises:** Admin uniquement

```http
POST /contacts-professionnels
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Dupont",
    "email": "contact@exemple.com",
    "telephone": "+33123456789",
    "message": "Demande de renseignements",
    "reseaux_sociaux": {
        "linkedin": "https://linkedin.com/in/dupont",
        "twitter": "@dupont"
    },
    "actif": true
}
```

### Modifier un contact professionnel - `PATCH /contacts-professionnels/:id`
Modifier un contact professionnel existant (admin uniquement).

**Permissions requises:** Admin uniquement

### Supprimer un contact professionnel - `DELETE /contacts-professionnels/:id`
Supprimer un contact professionnel (admin uniquement).

**Permissions requises:** Admin uniquement

---

## Téléchargements de fichiers

### Télécharger le logo d'un établissement - `GET /etablissements/:id/logo`
Télécharger le logo.
```http
GET /etablissements/1/logo
Authorization: Bearer <token>
```

### Télécharger le fichier d'une épreuve - `GET /epreuves/:id/telechargement`
Télécharger le fichier associé à l'épreuve.
```http
GET /epreuves/1/telechargement
Authorization: Bearer <token>
```

### Télécharger le fichier d'une ressource - `GET /ressources/:id/telechargement`
Télécharger le fichier associé à la ressource.
```http
GET /ressources/1/telechargement
Authorization: Bearer <token>
```

### Télécharger le fichier d'un concours - `GET /concours/:id/telechargement`
Télécharger le fichier associé au concours.
```http
GET /concours/1/telechargement
Authorization: Bearer <token>
```

### Télécharger l'image d'un événement - `GET /evenements/:id/telechargement`
Télécharger l'image/fichier associé à l'événement.
```http
GET /evenements/1/telechargement
Authorization: Bearer <token>
```

### Télécharger l'image d'une opportunité - `GET /opportunites/:id/telechargement`
Télécharger l'image associée à l'opportunité.
```http
GET /opportunites/1/telechargement
Authorization: Bearer <token>
```

### Télécharger les fichiers d'une publicité
**Média (Contenu principal):**
```http
GET /publicites/1/media
Authorization: Bearer <token>
```

**Image (Couverture):**
```http
GET /publicites/1/image
Authorization: Bearer <token>
```

## Réponses d'erreur

### 400 Bad Request
Les messages d'erreur de validation sont en français.

**Exemples de messages d'erreur de validation:**
- Email invalide: `"L'adresse email doit être valide"`
- Mot de passe trop court: `"Le mot de passe doit contenir au moins 8 caractères"`
- Rôle invalide: `"Le rôle doit être l'un des suivants: admin, étudiant, professeur, autre"`
- Sexe invalide: `"Le sexe doit être l'un des suivants: M, F, Autre"`
- Champ requis manquant: `"Le champ [nom] doit être une chaîne de caractères"`
- Propriété non autorisée: `"property [nom_propriété] should not exist"`

```json
{
    "statusCode": 400,
    "message": ["L'adresse email doit être valide", "Le mot de passe doit contenir au moins 8 caractères"],
    "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
    "statusCode": 404,
    "message": "Utilisateur non trouvé",
    "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
    "statusCode": 500,
    "message": "Internal server error",
    "error": "Internal Server Error"
}
```