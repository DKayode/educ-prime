-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "app_platform_enum" AS ENUM ('android', 'ios');

-- CreateEnum
CREATE TYPE "appareil_type_enum" AS ENUM ('mobile', 'web');

-- CreateEnum
CREATE TYPE "epreuves_type_enum" AS ENUM ('Interrogation', 'Devoirs', 'Concours', 'Examens');

-- CreateEnum
CREATE TYPE "likes_type_enum" AS ENUM ('like', 'dislike');

-- CreateEnum
CREATE TYPE "parcours_media_type_enum" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "publicites_type_media_enum" AS ENUM ('Image', 'Video');

-- CreateEnum
CREATE TYPE "ressources_type_enum" AS ENUM ('Quiz', 'Exercices', 'Document');

-- CreateEnum
CREATE TYPE "utilisateurs_role_enum" AS ENUM ('admin', 'étudiant', 'professeur', 'autre');

-- CreateEnum
CREATE TYPE "utilisateurs_sexe_enum" AS ENUM ('M', 'F', 'Autre');

-- CreateTable
CREATE TABLE "app_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" "app_platform_enum" NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "minimum_required_version" VARCHAR(50) NOT NULL,
    "update_url" TEXT NOT NULL,
    "force_update" BOOLEAN DEFAULT false,
    "release_notes" JSONB,
    "is_active" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "date_expiration" TIMESTAMPTZ(6) NOT NULL,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "couleur" VARCHAR(7),
    "is_active" BOOLEAN DEFAULT true,
    "ordre" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires" (
    "id" SERIAL NOT NULL,
    "parcours_id" INTEGER NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "date_commentaire" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_id" INTEGER,

    CONSTRAINT "commentaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires_closure" (
    "id_ancestor" INTEGER NOT NULL,
    "id_descendant" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "commentaires_closure_pkey" PRIMARY KEY ("id_ancestor","id_descendant")
);

-- CreateTable
CREATE TABLE "concours" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "lieu" VARCHAR(255),
    "url" TEXT,
    "annee" INTEGER,
    "nombre_page" INTEGER DEFAULT 0,
    "nombre_telechargements" INTEGER DEFAULT 0,

    CONSTRAINT "concours_examens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts_professionnels" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(50),
    "message" TEXT,
    "reseaux_sociaux" JSONB,
    "actif" BOOLEAN DEFAULT true,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_professionnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "epreuves" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "professeur_id" INTEGER NOT NULL,
    "matiere_id" INTEGER NOT NULL,
    "duree_minutes" INTEGER NOT NULL,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_publication" TIMESTAMPTZ(6),
    "type" "epreuves_type_enum",
    "nombre_pages" INTEGER NOT NULL DEFAULT 0,
    "nombre_telechargements" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "epreuves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etablissements" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "ville" VARCHAR(100),
    "code_postal" VARCHAR(20),
    "logo" TEXT,

    CONSTRAINT "etablissements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenements" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMPTZ(6),
    "lieu" VARCHAR(255),
    "lien_inscription" TEXT,
    "image" TEXT,
    "actif" BOOLEAN DEFAULT true,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evenements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoris" (
    "id" SERIAL NOT NULL,
    "parcours_id" INTEGER NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "date_favoris" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filieres" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "etablissement_id" INTEGER NOT NULL,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" SERIAL NOT NULL,
    "parcours_id" INTEGER,
    "commentaire_id" INTEGER,
    "utilisateur_id" INTEGER NOT NULL,
    "date_like" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_dislike" TIMESTAMPTZ(6),
    "type" "likes_type_enum" DEFAULT 'like',

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "niveau_etude_id" INTEGER NOT NULL,
    "filiere_id" INTEGER NOT NULL,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "niveau_etude" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "duree_mois" INTEGER,
    "filiere_id" INTEGER NOT NULL,

    CONSTRAINT "niveau_etude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_utilisateurs" (
    "id" SERIAL NOT NULL,
    "notification_id" INTEGER NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50) DEFAULT 'other',
    "priority" VARCHAR(50) DEFAULT 'normal',
    "data" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6),
    "sender_id" INTEGER,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunites" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "organisme" VARCHAR(255),
    "lieu" VARCHAR(100),
    "date_publication" DATE,
    "image" TEXT,
    "lien_postuler" TEXT,
    "actif" BOOLEAN DEFAULT true,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcours" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "image_couverture" VARCHAR(500),
    "lien_video" VARCHAR(500),
    "type_media" "parcours_media_type_enum" NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" INTEGER,

    CONSTRAINT "parcours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicites" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "image" TEXT,
    "media" TEXT,
    "ordre" INTEGER DEFAULT 0,
    "actif" BOOLEAN DEFAULT true,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type_media" "publicites_type_media_enum",

    CONSTRAINT "publicites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_expiration" TIMESTAMPTZ(6) NOT NULL,
    "appareil" "appareil_type_enum",

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ressources" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "type" "ressources_type_enum" NOT NULL,
    "url" TEXT NOT NULL,
    "professeur_id" INTEGER NOT NULL,
    "matiere_id" INTEGER NOT NULL,
    "date_creation" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_publication" TIMESTAMPTZ(6),
    "nombre_pages" INTEGER NOT NULL DEFAULT 0,
    "nombre_telechargements" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ressources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "pseudo" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "photo" TEXT,
    "etablissement_id" INTEGER,
    "filiere_id" INTEGER,
    "niveau_etude_id" INTEGER,
    "sexe" "utilisateurs_sexe_enum",
    "telephone" VARCHAR(50),
    "role" "utilisateurs_role_enum",
    "fcm_token" TEXT,
    "est_desactive" BOOLEAN DEFAULT false,
    "date_suppression_prevue" TIMESTAMP(6),
    "date_creation" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "code_reinitialisation" VARCHAR(6),
    "date_expiration_code" TIMESTAMP(6),
    "mon_code_parrainage" VARCHAR(20),
    "parrain_id" INTEGER,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forums" (
    "id" SERIAL NOT NULL,
    "theme" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "photo" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "forums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "like_users" (
    "id" SERIAL NOT NULL,
    "likeable_id" BIGINT NOT NULL,
    "likeable_type" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "like_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaire_users" (
    "id" SERIAL NOT NULL,
    "commentable_id" BIGINT NOT NULL,
    "commentable_type" TEXT NOT NULL,
    "commentaire_id" INTEGER,
    "content" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "commentaire_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_tokens_token_key" ON "blacklisted_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_key" ON "categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_commentaires_closure_ancestor" ON "commentaires_closure"("id_ancestor");

-- CreateIndex
CREATE INDEX "idx_commentaires_closure_depth" ON "commentaires_closure"("depth");

-- CreateIndex
CREATE INDEX "idx_commentaires_closure_descendant" ON "commentaires_closure"("id_descendant");

-- CreateIndex
CREATE UNIQUE INDEX "favoris_parcours_id_utilisateur_id_key" ON "favoris"("parcours_id", "utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_commentaire_id_utilisateur_id_key" ON "likes"("commentaire_id", "utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_parcours_id_utilisateur_id_key" ON "likes"("parcours_id", "utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_utilisateurs_notification_id_utilisateur_id_key" ON "notification_utilisateurs"("notification_id", "utilisateur_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_mon_code_parrainage_key" ON "utilisateurs"("mon_code_parrainage");

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "commentaires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commentaires_closure" ADD CONSTRAINT "commentaires_closure_id_ancestor_fkey" FOREIGN KEY ("id_ancestor") REFERENCES "commentaires"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commentaires_closure" ADD CONSTRAINT "commentaires_closure_id_descendant_fkey" FOREIGN KEY ("id_descendant") REFERENCES "commentaires"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "epreuves" ADD CONSTRAINT "epreuves_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "epreuves" ADD CONSTRAINT "epreuves_professeur_id_fkey" FOREIGN KEY ("professeur_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favoris" ADD CONSTRAINT "favoris_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_commentaire_id_fkey" FOREIGN KEY ("commentaire_id") REFERENCES "commentaires"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matieres" ADD CONSTRAINT "matieres_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matieres" ADD CONSTRAINT "matieres_niveau_etude_id_fkey" FOREIGN KEY ("niveau_etude_id") REFERENCES "niveau_etude"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "niveau_etude" ADD CONSTRAINT "niveau_etude_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_utilisateurs" ADD CONSTRAINT "notification_utilisateurs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_utilisateurs" ADD CONSTRAINT "notification_utilisateurs_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parcours" ADD CONSTRAINT "fk_parcours_categories" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ressources" ADD CONSTRAINT "ressources_matiere_id_fkey" FOREIGN KEY ("matiere_id") REFERENCES "matieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ressources" ADD CONSTRAINT "ressources_professeur_id_fkey" FOREIGN KEY ("professeur_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_etablissement_id_fkey" FOREIGN KEY ("etablissement_id") REFERENCES "etablissements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_niveau_etude_id_fkey" FOREIGN KEY ("niveau_etude_id") REFERENCES "niveau_etude"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_parrain_id_fkey" FOREIGN KEY ("parrain_id") REFERENCES "utilisateurs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forums" ADD CONSTRAINT "forums_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "like_users" ADD CONSTRAINT "like_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaire_users" ADD CONSTRAINT "commentaire_users_commentaire_id_fkey" FOREIGN KEY ("commentaire_id") REFERENCES "commentaire_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaire_users" ADD CONSTRAINT "commentaire_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

