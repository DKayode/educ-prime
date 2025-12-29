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
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appareil_type_enum') THEN
        CREATE TYPE appareil_type_enum AS ENUM ('mobile', 'web');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epreuves_type_enum') THEN
        CREATE TYPE epreuves_type_enum AS ENUM ('Interrogation', 'Devoirs', 'Concours', 'Examens');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publicites_type_media_enum') THEN
        CREATE TYPE publicites_type_media_enum AS ENUM ('Image', 'Video');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parcours_media_type_enum') THEN
        CREATE TYPE parcours_media_type_enum AS ENUM ('image', 'video');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'likes_type_enum') THEN
        CREATE TYPE likes_type_enum AS ENUM ('like', 'dislike');
    END IF;
END $$;

-- ------------------------------
-- 2. CREATE CORE ACADEMIC TABLES
-- ------------------------------

CREATE TABLE IF NOT EXISTS etablissements (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    logo TEXT
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
    fcm_token TEXT,
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
    nombre_pages INTEGER NOT NULL DEFAULT 0,
    nombre_telechargements INTEGER NOT NULL DEFAULT 0,
    type epreuves_type_enum,
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
    nombre_pages INTEGER NOT NULL DEFAULT 0,
    nombre_telechargements INTEGER NOT NULL DEFAULT 0,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_publication TIMESTAMP WITH TIME ZONE
);

-- ------------------------------
-- 5. CREATE REFRESH TOKEN TABLE
-- ------------------------------

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP WITH TIME ZONE NOT NULL,
    appareil appareil_type_enum
);

-- ------------------------------
-- 6. CREATE PUBLIC CONTENT TABLES
-- ------------------------------

-- Publicités table
CREATE TABLE IF NOT EXISTS publicites (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    image TEXT,
    media TEXT,
    ordre INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    type_media publicites_type_media_enum,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Événements table
CREATE TABLE IF NOT EXISTS evenements (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE,
    lieu VARCHAR(255),
    lien_inscription TEXT,
    image TEXT,
    actif BOOLEAN DEFAULT true,
    e TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Opportunités table (Bourses, Stages)
CREATE TABLE IF NOT EXISTS opportunites (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Bourses', 'Stages')),
    organisme VARCHAR(255),
    lieu VARCHAR(100),
    date_limite DATE,
    image TEXT,
    lien_postuler TEXT,
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Concours table
CREATE TABLE IF NOT EXISTS concours (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    url TEXT,
    annee INTEGER,
    lieu VARCHAR(100),
    nombre_page INTEGER DEFAULT 0,
    nombre_telechargements INTEGER DEFAULT 0
);

-- Contacts Professionnels table
CREATE TABLE IF NOT EXISTS contacts_professionnels (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(50),
    message TEXT,
    reseaux_sociaux JSONB,
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------
-- 8. CREATE INTERACTIVE/SOCIAL TABLES
-- ------------------------------

CREATE TABLE IF NOT EXISTS parcours (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    image_couverture VARCHAR(500),
    lien_video VARCHAR(500),
    type_media parcours_media_type_enum NOT NULL,
    categorie VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commentaires (
    id SERIAL PRIMARY KEY,
    parcours_id INTEGER NOT NULL REFERENCES parcours(id),
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    contenu TEXT NOT NULL,
    date_commentaire TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER REFERENCES commentaires(id)
);


CREATE TABLE commentaires_closure (
    id_ancestor INTEGER NOT NULL,
    id_descendant INTEGER NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (id_ancestor, id_descendant),
    FOREIGN KEY (id_ancestor) REFERENCES commentaires(id) ON DELETE CASCADE,
    FOREIGN KEY (id_descendant) REFERENCES commentaires(id) ON DELETE CASCADE
);

CREATE INDEX idx_commentaires_closure_ancestor ON commentaires_closure(id_ancestor);
CREATE INDEX idx_commentaires_closure_descendant ON commentaires_closure(id_descendant);
CREATE INDEX idx_commentaires_closure_depth ON commentaires_closure(depth);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    parcours_id INTEGER REFERENCES parcours(id),
    commentaire_id INTEGER REFERENCES commentaires(id),
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    date_like TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_dislike TIMESTAMP WITH TIME ZONE,
    type likes_type_enum DEFAULT 'like',
    UNIQUE(parcours_id, utilisateur_id),
    UNIQUE(commentaire_id, utilisateur_id)
);

CREATE TABLE IF NOT EXISTS favoris (
    id SERIAL PRIMARY KEY,
    parcours_id INTEGER NOT NULL REFERENCES parcours(id) ON DELETE CASCADE,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
    date_favoris TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parcours_id, utilisateur_id)
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  couleur VARCHAR(7),
  icone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE parcours ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- ------------------------------
-- 7. CREATE DEFAULT ADMIN USER
-- ------------------------------
-- Install pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert default admin user if not exists
-- Password: MotDePasse123! (hashed with bcrypt)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role)
SELECT 'Admin', 'System', 'admin@exemple.com', crypt('MotDePasse123!', gen_salt('bf')), 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM utilisateurs WHERE email = 'admin@exemple.com'
);
