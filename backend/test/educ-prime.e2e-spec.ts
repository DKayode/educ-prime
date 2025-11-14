import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { testDbConfig } from './test-db.config';
import { RoleType, SexeType } from '../src/utilisateurs/entities/utilisateur.entity';
import { MockFirebaseConfig } from '../src/config/mock-firebase.config';

describe('EducPrime API (e2e)', () => {
  let app: INestApplication;
  // Auth tokens for different roles
  let adminToken: string;
  let professorToken: string;
  let studentToken: string;
  // Entity IDs
  let adminId: number;
  let professorId: number;
  let studentId: number;
  let etablissementId: number;
  let filiereId: number;
  let niveauEtudeId: number;
  let matiereId: number;
  let epreuveId: number;
  let ressourceId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        AppModule
      ],
    })
    .overrideProvider('FirebaseConfig')
    .useClass(MockFirebaseConfig)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('1. Authentication & User Management', () => {
    it('should register an admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/utilisateurs/inscription')
        .send({
          nom: 'Admin',
          prenom: 'System',
          email: 'admin@test.com',
          mot_de_passe: 'Admin123!',
          role: RoleType.ADMIN,
          sexe: SexeType.AUTRE
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      adminId = response.body.id;
    });

    it('should register a professor', async () => {
      const response = await request(app.getHttpServer())
        .post('/utilisateurs/inscription')
        .send({
          nom: 'Professeur',
          prenom: 'Test',
          email: 'prof@test.com',
          mot_de_passe: 'Prof123!',
          role: RoleType.PROFESSEUR,
          sexe: SexeType.M
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      professorId = response.body.id;
    });

    it('should register a student', async () => {
      const response = await request(app.getHttpServer())
        .post('/utilisateurs/inscription')
        .send({
          nom: 'Étudiant',
          prenom: 'Test',
          email: 'etudiant@test.com',
          mot_de_passe: 'Student123!',
          role: RoleType.ETUDIANT,
          sexe: SexeType.F
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      studentId = response.body.id;
    });

    it('should authenticate all users', async () => {
      // Login admin
      const adminLogin = await request(app.getHttpServer())
        .post('/auth/connexion')
        .send({
          email: 'admin@test.com',
          mot_de_passe: 'Admin123!'
        });

      expect(adminLogin.status).toBe(200);
      expect(adminLogin.body).toHaveProperty('access_token');
      adminToken = adminLogin.body.access_token;

      // Login professor
      const profLogin = await request(app.getHttpServer())
        .post('/auth/connexion')
        .send({
          email: 'prof@test.com',
          mot_de_passe: 'Prof123!'
        });

      expect(profLogin.status).toBe(200);
      expect(profLogin.body).toHaveProperty('access_token');
      professorToken = profLogin.body.access_token;

      // Login student
      const studentLogin = await request(app.getHttpServer())
        .post('/auth/connexion')
        .send({
          email: 'etudiant@test.com',
          mot_de_passe: 'Student123!'
        });

      expect(studentLogin.status).toBe(200);
      expect(studentLogin.body).toHaveProperty('access_token');
      studentToken = studentLogin.body.access_token;
    });

    it('should not allow access without token', () => {
      return request(app.getHttpServer())
        .get('/utilisateurs')
        .expect(401);
    });
  });

  describe('2. Academic Structure', () => {
    it('should create etablissement', async () => {
      const response = await request(app.getHttpServer())
        .post('/etablissements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Université Test',
          ville: 'Paris',
          code_postal: '75000'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      etablissementId = response.body.id;
    });

    it('should create filiere', async () => {
      const response = await request(app.getHttpServer())
        .post('/filieres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'Informatique',
          etablissement_id: etablissementId
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      filiereId = response.body.id;
    });

    it('should create niveau-etude', async () => {
      const response = await request(app.getHttpServer())
        .post('/niveau-etude')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nom: 'License 3',
          duree_mois: 12,
          filiere_id: Number(filiereId)
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      niveauEtudeId = response.body.id;
    });
  });

  describe('3. Content Management', () => {
    it('should create matiere', async () => {
      const response = await request(app.getHttpServer())
        .post('/matieres')
        .set('Authorization', `Bearer ${professorToken}`)
        .send({
          nom: 'Algorithmique',
          description: 'Introduction aux algorithmes',
          niveau_etude_id: Number(niveauEtudeId),
          filiere_id: Number(filiereId)
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      matiereId = response.body.id;
    });

    it('should create epreuve', async () => {
      const response = await request(app.getHttpServer())
        .post('/epreuves')
        .set('Authorization', `Bearer ${professorToken}`)
        .send({
          titre: 'Examen Final',
          url: 'https://example.com/exam.pdf',
          matiere_id: Number(matiereId),
          duree_minutes: 180,
          date_publication: '2025-12-01T14:00:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('professeur_id');
      expect(response.body).toHaveProperty('date_creation');
      epreuveId = response.body.id;
    });

    it('should create ressource', async () => {
      const response = await request(app.getHttpServer())
        .post('/ressources')
        .set('Authorization', `Bearer ${professorToken}`)
        .send({
          titre: 'Support de cours',
          type: 'Document',
          url: 'https://example.com/support.pdf',
          matiere_id: Number(matiereId),
          date_publication: '2025-12-01T14:00:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('professeur_id');
      expect(response.body).toHaveProperty('date_creation');
      ressourceId = response.body.id;
    });
  });

  describe('4. File Management', () => {
    it('should upload a file as professor', async () => {
      const testFilePath = path.join(__dirname, '../test-upload.txt');
      
      await request(app.getHttpServer())
        .post('/fichiers/upload')
        .set('Authorization', `Bearer ${professorToken}`)
        .attach('file', testFilePath)
        .query({ type: 'document' })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('url');
          expect(res.body).toHaveProperty('filename');
          expect(res.body).toHaveProperty('type', 'document');
          expect(res.body.utilisateurId).toBe(professorId);
        });
    });

    it('should not allow file upload without authentication', async () => {
      const testFilePath = path.join(__dirname, '../test-upload.txt');
      
      await request(app.getHttpServer())
        .post('/fichiers/upload')
        .attach('file', testFilePath)
        .expect(401);
    });

    it('should upload different types of files', async () => {
      const testFilePath = path.join(__dirname, '../test-upload.txt');
      const fileTypes = ['examen', 'exercice', 'quiz', 'document'];
      
      for (const type of fileTypes) {
        const response = await request(app.getHttpServer())
          .post('/fichiers/upload')
          .set('Authorization', `Bearer ${professorToken}`)
          .attach('file', testFilePath)
          .query({ type });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('type', type);
        expect(response.body.filename).toContain(type + '/');
      }
    });
  });

  describe('5. Access Control', () => {
    it('should not allow students to create matiere', async () => {
      await request(app.getHttpServer())
        .post('/matieres')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          nom: 'Test Matiere',
          niveau_etude_id: niveauEtudeId,
          filiere_id: filiereId
        })
        .expect(403);
    });

    it('should not allow professors to create etablissement', async () => {
      await request(app.getHttpServer())
        .post('/etablissements')
        .set('Authorization', `Bearer ${professorToken}`)
        .send({
          nom: 'Test Etablissement',
          ville: 'Paris',
          code_postal: '75000'
        })
        .expect(403);
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});