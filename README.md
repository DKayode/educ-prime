# Plateforme Educ-Prime

**Educ-Prime** est une plateforme éducative complète pour la gestion et la distribution d'épreuves d'examen avec un contrôle d'accès basé sur les rôles.

## 🏗️ Architecture

Le projet est structuré comme un monorepo :

*   **[Backend](./backend/README.md)** : API NestJS avec PostgreSQL, authentification JWT et stockage Firebase.
*   **[Frontend](./frontend/README.md)** : Tableau de bord administrateur React construit avec Vite et Shadcn/ui.

## 🚀 Démarrage Rapide

La façon la plus simple de lancer toute la plateforme est d'utiliser Docker.

### Prérequis
*   Docker & Docker Compose installés
*   Git

### Lancer avec Docker

1.  **Cloner le dépôt :**
    ```bash
    git clone <url-du-depot>
    cd educ-prime
    ```

2.  **Configurer l'environnement :**
    Copiez les modèles `*.example` et remplissez-les avec les identifiants de
    **test** (jamais la production). Guide complet pour les nouveaux devs :
    [`docs/DEV_SETUP.md`](docs/DEV_SETUP.md).
    ```bash
    cp .env.example .env
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    cp backend/config/config.example.json backend/config/config.json
    cp backend/config/firebase-serviceaccount.example.json backend/config/firebase-serviceaccount.json
    ```
    > ⚠️ Utilisez la base de données de **test `edukia-dev`**, jamais la base de
    > production.

3.  **Démarrer les services :**
    ```bash
    docker-compose -f docker-compose.dev.yml up -d
    ```

4.  **Accéder à la plateforme :**
    *   **Frontend** : http://localhost:80
    *   **API Backend** : http://localhost:3000
    *   **Base de données** : localhost:5432

## 📚 Documentation

Pour des guides de développement détaillés, veuillez vous référer à la documentation spécifique :

*   **Backend** : [backend/README.md](./backend/README.md) - Endpoints API, installation locale et configuration.
*   **Frontend** : [frontend/README.md](./frontend/README.md) - Composants UI, gestion d'état et scripts de build.
*   **Déploiement** : Voir la section Guide de Déploiement Docker ci-dessous.

## 🗂️ Structure du Projet

```
educ-prime/
├── backend/                 # Application backend NestJS
├── frontend/                # Application frontend React
├── docker-compose.yml       # Docker Compose pour la production
├── docker-compose.dev.yml   # Docker Compose pour le développement
└── DOCKER_DEPLOYMENT.md     # Guide de déploiement (fusionné ci-dessous)
```

## 🔀 Workflow Git

### Branches
*   `main` : Code prêt pour la production.
*   `feature/*` : Nouvelles fonctionnalités.
*   `fix/*` : Corrections de bugs.

### Messages de Commit
Suivez la convention "Conventional Commits" :
*   `feat` : Nouvelle fonctionnalité
*   `fix` : Correction de bug
*   `chore` : Maintenance, dépendances, documentation

## 🤝 Contribuer

1.  Forker le dépôt
2.  Créer une branche de fonctionnalité
3.  Commiter vos changements
4.  Pousser vers la branche
5.  Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.


