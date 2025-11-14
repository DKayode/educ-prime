# Documentation de l'API - Educ Prime

## Aperçu

Ce document décrit l'ensemble des points d'accès REST de la plateforme Educ Prime. Toutes les routes protégées nécessitent un jeton JWT valide obtenu via le processus d'authentification.

## Points d'accès d'authentification

### Inscription - `POST /utilisateurs/inscription`
Créer un nouvel utilisateur.
```http
POST /utilisateurs/inscription
Content-Type: application/json

{
    "email": "utilisateur@exemple.com",
    "mot_de_passe": "MotDePasse123!",
    "nom": "Dupont",
    "prenom": "Jean",
    "pseudo": "jdupont",              // Facultatif
    "role": "étudiant",              // étudiant, professeur, admin, autre
    "sexe": "M",                     // M, F, Autre
    "photo": "https://...",          // Facultatif, URL vers la photo de profil
    "telephone": "+33123456789",     // Facultatif
    "etablissement_id": 1,           // Facultatif
    "filiere_id": 1,                 // Facultatif
    "niveau_etude_id": 1             // Facultatif
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

### Connexion - `POST /auth/connexion`
Authentifier un utilisateur existant.
```http
POST /auth/connexion
Content-Type: application/json

{
    "email": "utilisateur@exemple.com",
    "mot_de_passe": "MotDePasse123!"
}
```
Response (200 OK):
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Déconnexion - `POST /auth/deconnexion`
Invalider la session en cours.
```http
POST /auth/deconnexion
Authorization: Bearer <token>
```

## Structure académique

### Créer un établissement - `POST /etablissements`
Créer un nouvel établissement (admin uniquement).
```http
POST /etablissements
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Université Paris-Saclay",
    "ville": "Paris",
    "code_postal": "75000"
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

### Créer une filière - `POST /filieres`
Créer un nouveau programme (admin uniquement).
```http
POST /filieres
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Informatique",
    "etablissement_id": 1
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

### Créer un niveau d'étude - `POST /niveau-etude`
Créer un nouveau niveau d'étude (admin uniquement).
```http
POST /niveau-etude
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "License 3",
    "duree_mois": 12,
    "filiere_id": 1
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

## Gestion de contenu

### Créer une matière - `POST /matieres`
Créer une nouvelle matière (professeur uniquement).
```http
POST /matieres
Authorization: Bearer <token>
Content-Type: application/json

{
    "nom": "Algorithmique",
    "description": "Introduction aux algorithmes",
    "niveau_etude_id": 1,
    "filiere_id": 1
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

### Créer une épreuve - `POST /epreuves`
Créer une nouvelle épreuve (professeur uniquement).
```http
POST /epreuves
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Examen Final",
    "url": "https://exemple.com/exam.pdf",
    "matiere_id": 1,
    "duree_minutes": 180,
    "date_publication": "2025-12-01T14:00:00Z"  // Optional, future publication date
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

### Créer une ressource - `POST /ressources`
Créer une nouvelle ressource (professeur uniquement).
```http
POST /ressources
Authorization: Bearer <token>
Content-Type: application/json

{
    "titre": "Support de cours",
    "type": "Document",              // Valeurs acceptées : Document, Quiz, Exercices
    "url": "https://exemple.com/support.pdf",
    "matiere_id": 1,
    "date_publication": "2025-12-01T14:00:00Z"  // Facultatif, date de publication future
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

### Lister les matières - `GET /matieres`
Obtenir la liste des matières.
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

### Lister les épreuves - `GET /epreuves`
Obtenir la liste des épreuves.
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

### Lister les ressources - `GET /ressources`
Obtenir la liste des ressources.
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

## Gestion des fichiers

### Envoyer un fichier - `POST /fichiers`
Télécharger un fichier vers Firebase Storage et mettre à jour l'entité associée (épreuve ou ressource).

**Remarques importantes :**
- L'URL du fichier est automatiquement enregistrée dans la table `epreuves` ou `ressources`.
- Si l'entité n'existe pas, elle est créée automatiquement.
- En cas d'échec du téléversement, toute entité nouvellement créée est annulée.
- Les chemins générés dans Firebase sont normalisés en minuscules (ex. `ressources/document/...`).
- Le champ `typeRessource` est sensible à la casse et doit valoir `Document`, `Quiz` ou `Exercices`.

```http
POST /fichiers
Authorization: Bearer <token>
Content-Type: multipart/form-data

// Pour créer une nouvelle épreuve avec un fichier :
file: <file-data>
type: "epreuve"
matiereId: 1
epreuveTitre: "Examen Final"
dureeMinutes: 180

// Pour ajouter un fichier à une épreuve existante :
file: <file-data>
type: "epreuve"
matiereId: 1
epreuveId: 1

// Pour créer une nouvelle ressource avec un fichier :
file: <file-data>
type: "ressource"
typeRessource: "Document" | "Quiz" | "Exercices"
matiereId: 1
ressourceTitre: "Support de cours"

// Pour ajouter un fichier à une ressource existante :
file: <file-data>
type: "ressource"
typeRessource: "Document" | "Quiz" | "Exercices"
matiereId: 1
ressourceId: 1

// Pour télécharger une photo de profil :
file: <file-data>
type: "profile"
```

Réponse (201 Created) - Nouvelle épreuve créée :
```json
{
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/epreuves/1/2/exam.pdf",
    "type": "epreuve",
    "entityId": 2
}
```

Réponse (201 Created) - Épreuve existante mise à jour :
```json
{
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/epreuves/1/1/exam.pdf",
    "type": "epreuve",
    "entityId": 1
}
```

Réponse (201 Created) - Nouvelle ressource créée :
```json
{
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/ressources/document/1/3/cours.pdf",
    "type": "ressource",
    "entityId": 3
}
```

Réponse (201 Created) - Photo de profil :
```json
{
    "url": "https://storage.googleapis.com/educ-prime.firebasestorage.app/utilisateurs/2/profile.jpg",
    "type": "profile",
    "entityId": 2
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
```json
{
    "statusCode": 400,
    "message": ["email must be an email", "password is required"],
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