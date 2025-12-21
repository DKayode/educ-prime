import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseConfig {
  private readonly logger = new Logger(FirebaseConfig.name);

  constructor() {
    try {
      this.logger.log('Initializing Firebase configuration...');
      if (!admin.apps.length) {
        // Load service account JSON file located at backend/config/firebase-serviceaccount.json
        const serviceAccountPath = path.join(process.cwd(), 'config', 'firebase-serviceaccount.json');

        this.logger.log(`Loading Firebase credentials from: ${serviceAccountPath}`);

        if (!fs.existsSync(serviceAccountPath)) {
          const msg = `Firebase service account file not found at: ${serviceAccountPath}`;
          this.logger.error(msg);
          throw new Error(msg);
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