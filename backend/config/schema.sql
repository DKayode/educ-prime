-- Schema-only SQL to create enums and tables inside the existing database `educ_prime`.

-- ------------------------------
-- 1. CREATE CUSTOM ENUM TYPES (if not exists)
-- ------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utilisateurs_role_enum') THEN
        CREATE TYPE utilisateurs_role_enum AS ENUM ('admin', 'étudiant', 'professeur', 'autre');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utilisateurs_sexe_enum') THEN
        CREATE TYPE utilisateurs_sexe_enum AS ENUM ('M', 'F', 'Autre');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ressources_type_enum') THEN
        CREATE TYPE ressources_type_enum AS ENUM ('Quiz', 'Exercices', 'Document');
    END IF;
END $$;

-- ------------------------------
-- 2. CREATE CORE ACADEMIC TABLES
-- ------------------------------

CREATE TABLE IF NOT EXISTS etablissements (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    ville VARCHAR(100),
    code_postal VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS filieres (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    etablissement_id INTEGER NOT NULL REFERENCES etablissements(id)
);

CREATE TABLE IF NOT EXISTS niveau_etude (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    duree_mois INTEGER,
    filiere_id INTEGER NOT NULL REFERENCES filieres(id)
);

-- ------------------------------
-- 3. CREATE MAIN USER TABLE
-- ------------------------------

CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    pseudo VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    photo TEXT,
    etablissement_id INTEGER REFERENCES etablissements(id),
    filiere_id INTEGER REFERENCES filieres(id),
    niveau_etude_id INTEGER REFERENCES niveau_etude(id),
    sexe utilisateurs_sexe_enum,
    telephone VARCHAR(50),
    role utilisateurs_role_enum
);

-- ------------------------------
-- 4. CREATE SUBJECT AND CONTENT TABLES
-- ------------------------------

CREATE TABLE IF NOT EXISTS matieres (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    niveau_etude_id INTEGER NOT NULL REFERENCES niveau_etude(id),
    filiere_id INTEGER NOT NULL REFERENCES filieres(id)
);

CREATE TABLE IF NOT EXISTS epreuves (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    professeur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    matiere_id INTEGER NOT NULL REFERENCES matieres(id),
    duree_minutes INTEGER NOT NULL,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_publication TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS ressources (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    type ressources_type_enum NOT NULL,
    url TEXT NOT NULL,
    professeur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    matiere_id INTEGER NOT NULL REFERENCES matieres(id),
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_publication TIMESTAMP WITH TIME ZONE
);
