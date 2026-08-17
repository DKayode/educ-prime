import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseConfig {
  private readonly logger = new Logger(FirebaseConfig.name);

  /**
   * Faux quand le compte de service est absent en développement.
   *
   * Sert à rendre une erreur qui se lit, plutôt que le « The default Firebase
   * app does not exist » de la bibliothèque, qui remonte en 500 opaque et
   * envoie chercher la cause du mauvais côté.
   */
  private disponible = true;

  constructor() {
    try {
      this.logger.log('Initializing Firebase configuration...');
      if (!admin.apps.length) {
        // Load service account JSON file located at backend/config/firebase-serviceaccount.json
        const serviceAccountPath = path.join(process.cwd(), 'config', 'firebase-serviceaccount.json');

        this.logger.log(`Loading Firebase credentials from: ${serviceAccountPath}`);

        if (!fs.existsSync(serviceAccountPath)) {
          const msg = `Firebase service account file not found at: ${serviceAccountPath}`;

          // En production, ce fichier est indispensable : mieux vaut refuser de
          // démarrer que servir une API dont le stockage tombera en panne au
          // premier appel.
          //
          // En développement, c'est l'inverse. Ce fournisseur est instancié au
          // démarrage par FilesModule, si bien que son absence empêchait de
          // lancer le backend en local — y compris pour travailler sur des
          // fonctionnalités qui n'ont rien à voir avec Firebase, comme la
          // modération des épreuves. On journalise et on continue : les seuls
          // appels qui échoueront sont ceux qui touchent réellement au
          // stockage Firebase, et ils échoueront explicitement.
          if (process.env.NODE_ENV === 'production') {
            this.logger.error(msg);
            throw new Error(msg);
          }

          this.disponible = false;
          this.logger.warn(
            `${msg} — Firebase désactivé pour cette exécution (NODE_ENV=${process.env.NODE_ENV ?? 'non défini'}). ` +
            `Le stockage R2 (soumissions, transcriptions Kessiah) fonctionne normalement ; ` +
            `seuls les fichiers hérités servis par Firebase répondront 503.`,
          );
          return;
        }

        const raw = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(raw);

        // Use the Firebase Storage bucket (newer projects use .firebasestorage.app)
        const storageBucket = `${serviceAccount.project_id}.firebasestorage.app`;

        this.logger.log(`Project ID: ${serviceAccount.project_id}`);
        this.logger.log(`Storage bucket: ${storageBucket}`);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          storageBucket,
        });

        this.logger.log('Firebase initialized successfully');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  getStorage() {
    if (!this.disponible) {
      throw new ServiceUnavailableException(
        "Stockage Firebase indisponible : backend/config/firebase-serviceaccount.json est absent. " +
        "Ce fichier n'est requis que pour les fichiers hérités, antérieurs à la migration vers R2. " +
        "Le déposer, ou mener le test sur une épreuve récente.",
      );
    }
    try {
      return admin.storage();
    } catch (error) {
      this.logger.error('Failed to get Firebase storage:', error);
      throw error;
    }
  }

  getBucket(): any {
    try {
      return this.getStorage().bucket();
    } catch (error) {
      this.logger.error('Failed to get Firebase bucket:', error);
      throw error;
    }
  }

  // getBucket() {
  //   try {
  //     return admin.storage().bucket();
  //   } catch (error) {
  //     this.logger.error('Failed to get Firebase bucket:', error);
  //     throw error;
  //   }
  // }
}