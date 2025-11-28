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
Obtenir la liste de tous les établissements.
```http
GET /etablissements
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
    {
        "id": 1,
        "nom": "Université Paris-Saclay",
        "ville": "Paris",
        "code_postal": "75000"
    }
]
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
    "code_postal": "75000"
}
```

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
        "filiere_id": 1
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
    "filiere_id": 1
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
        "niveau_etude_id": 1,
        "filiere_id": 1
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
    "niveau_etude_id": 1,
    "filiere_id": 1
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
Obtenir la liste de toutes les épreuves.
```http
GET /epreuves
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
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
]
```

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
    "matiere_id": 1,
    "professeur_id": 2,
    "duree_minutes": 180,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-01T14:00:00Z"
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

```http
POST /epreuves
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Examen Final",
    "url": "https://exemple.com/exam.pdf",
    "duree_minutes": 180,                        // Doit être un nombre
    "matiere_id": 1,                             // Doit être un nombre
    "date_publication": "2025-12-01T14:00:00Z"   // Facultatif, format date ISO 8601
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
Obtenir la liste de toutes les ressources.
```http
GET /ressources
Authorization: Bearer <token>
```
Response (200 OK):
```json
[
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
]
```

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
    "matiere_id": 1,
    "professeur_id": 2,
    "date_creation": "2025-11-09T10:30:00Z",
    "date_publication": "2025-12-01T14:00:00Z"
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
- `date_publication` (facultatif) : Date de publication future (format ISO 8601)

```http
PUT /ressources/1
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Support de cours - Version 2",
    "type": "Document",
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