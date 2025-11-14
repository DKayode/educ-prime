import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeFichier, TypeRessource } from '../src/fichiers/entities/fichier.entity';
import { MockFirebaseConfig, IFirebaseService } from '../src/config/mock-firebase.config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Fichier } from '../src/fichiers/entities/fichier.entity';

describe('FichiersController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let firebaseService: IFirebaseService;

  const mockFirebaseService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getDownloadURL: jest.fn(),
    bucket: {
      file: jest.fn(),
    },
  };

  const mockFichierRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MockFirebaseConfig)
      .useValue(mockFirebaseService)
      .overrideProvider(getRepositoryToken(Fichier))
      .useValue(mockFichierRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token by logging in
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/connexion')
      .send({
        email: 'test@example.com',
        mot_de_passe: 'password123',
      });

    authToken = loginResponse.body.access_token;
    firebaseService = moduleFixture.get<IFirebaseService>(MockFirebaseConfig);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/fichiers/upload (POST)', () => {
    it('should upload a profile picture', () => {
      const mockBuffer = Buffer.from('test image');
      const expectedUrl = 'https://storage.googleapis.com/test/utilisateurs/1/profile.jpg';

      mockFirebaseService.uploadFile.mockResolvedValue(undefined);
      mockFirebaseService.getDownloadURL.mockResolvedValue(expectedUrl);
      mockFichierRepository.save.mockResolvedValue({
        id: 1,
        filename: 'utilisateurs/1/profile.jpg',
        url: expectedUrl,
        utilisateurId: 1,
        originalName: 'profile.jpg',
        type: TypeFichier.PROFILE,
      });

      return request(app.getHttpServer())
        .post('/fichiers/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockBuffer, 'profile.jpg')
        .field('type', TypeFichier.PROFILE)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            id: 1,
            filename: 'utilisateurs/1/profile.jpg',
            url: expectedUrl,
            utilisateurId: 1,
            originalName: 'profile.jpg',
            type: TypeFichier.PROFILE,
          });
        });
    });

    it('should upload an exam file', () => {
      const mockBuffer = Buffer.from('test pdf');
      const expectedUrl = 'https://storage.googleapis.com/test/epreuves/1/1/exam.pdf';

      mockFirebaseService.uploadFile.mockResolvedValue(undefined);
      mockFirebaseService.getDownloadURL.mockResolvedValue(expectedUrl);
      mockFichierRepository.save.mockResolvedValue({
        id: 2,
        filename: 'epreuves/1/1/exam.pdf',
        url: expectedUrl,
        utilisateurId: 1,
        originalName: 'exam.pdf',
        type: TypeFichier.EPREUVE,
        matiereId: 1,
        epreuveId: 1,
      });

      return request(app.getHttpServer())
        .post('/fichiers/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockBuffer, 'exam.pdf')
        .field('type', TypeFichier.EPREUVE)
        .field('matiereId', '1')
        .field('epreuveId', '1')
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            id: 2,
            filename: 'epreuves/1/1/exam.pdf',
            url: expectedUrl,
            utilisateurId: 1,
            originalName: 'exam.pdf',
            type: TypeFichier.EPREUVE,
            matiereId: 1,
            epreuveId: 1,
          });
        });
    });

    it('should upload a resource file', () => {
      const mockBuffer = Buffer.from('test pdf');
      const expectedUrl = 'https://storage.googleapis.com/test/ressources/document/1/1/cours.pdf';

      mockFirebaseService.uploadFile.mockResolvedValue(undefined);
      mockFirebaseService.getDownloadURL.mockResolvedValue(expectedUrl);
      mockFichierRepository.save.mockResolvedValue({
        id: 3,
        filename: 'ressources/document/1/1/cours.pdf',
        url: expectedUrl,
        utilisateurId: 1,
        originalName: 'cours.pdf',
        type: TypeFichier.RESSOURCE,
        typeRessource: TypeRessource.DOCUMENT,
        matiereId: 1,
        ressourceId: 1,
      });

      return request(app.getHttpServer())
        .post('/fichiers/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockBuffer, 'cours.pdf')
        .field('type', TypeFichier.RESSOURCE)
        .field('typeRessource', TypeRessource.DOCUMENT)
        .field('matiereId', '1')
        .field('ressourceId', '1')
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({
            id: 3,
            filename: 'ressources/document/1/1/cours.pdf',
            url: expectedUrl,
            utilisateurId: 1,
            originalName: 'cours.pdf',
            type: TypeFichier.RESSOURCE,
            typeRessource: TypeRessource.DOCUMENT,
            matiereId: 1,
            ressourceId: 1,
          });
        });
    });
  });

  describe('/fichiers/:id/download (GET)', () => {
    it('should download a file', () => {
      const mockBuffer = Buffer.from('test pdf');
      mockFichierRepository.findOne.mockResolvedValue({
        id: 1,
        filename: 'test.pdf',
        originalName: 'test.pdf',
        type: TypeFichier.EPREUVE,
      });
      mockFirebaseService.bucket.file.mockReturnValue({
        download: jest.fn().mockResolvedValue([mockBuffer]),
      });

      return request(app.getHttpServer())
        .get('/fichiers/1/download')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect('Content-Disposition', 'attachment; filename="test.pdf"')
        .expect(mockBuffer);
    });

    it('should download a profile picture', () => {
      const mockBuffer = Buffer.from('test image');
      mockFichierRepository.findOne.mockResolvedValue({
        id: 2,
        filename: 'utilisateurs/1/profile.jpg',
        originalName: 'profile.jpg',
        type: TypeFichier.PROFILE,
      });
      mockFirebaseService.bucket.file.mockReturnValue({
        download: jest.fn().mockResolvedValue([mockBuffer]),
      });

      return request(app.getHttpServer())
        .get('/fichiers/2/download')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', 'image/jpeg')
        .expect('Content-Disposition', 'inline; filename="profile.jpg"')
        .expect(mockBuffer);
    });
  });

  describe('/fichiers/:id (DELETE)', () => {
    it('should delete a file', () => {
      mockFichierRepository.findOne.mockResolvedValue({
        id: 1,
        filename: 'test.pdf',
        utilisateurId: 1,
        type: TypeFichier.EPREUVE,
      });
      mockFirebaseService.deleteFile.mockResolvedValue(undefined);
      mockFichierRepository.delete.mockResolvedValue({ affected: 1 });

      return request(app.getHttpServer())
        .delete('/fichiers/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should not delete if unauthorized', () => {
      mockFichierRepository.findOne.mockResolvedValue({
        id: 1,
        filename: 'test.pdf',
        utilisateurId: 2,
        type: TypeFichier.EPREUVE,
      });

      return request(app.getHttpServer())
        .delete('/fichiers/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('/fichiers (GET)', () => {
    it('should get all files', () => {
      const mockFiles = [
        {
          id: 1,
          filename: 'test.pdf',
          type: TypeFichier.EPREUVE,
        },
      ];

      mockFichierRepository.find.mockResolvedValue(mockFiles);

      return request(app.getHttpServer())
        .get('/fichiers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: TypeFichier.EPREUVE })
        .expect(200)
        .expect(mockFiles);
    });
  });

  describe('/fichiers/utilisateur/:id (GET)', () => {
    it('should get files by user', () => {
      const mockFiles = [
        {
          id: 1,
          filename: 'test.pdf',
          utilisateurId: 1,
          type: TypeFichier.RESSOURCE,
          typeRessource: TypeRessource.DOCUMENT,
        },
      ];

      mockFichierRepository.find.mockResolvedValue(mockFiles);

      return request(app.getHttpServer())
        .get('/fichiers/utilisateur/1')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          type: TypeFichier.RESSOURCE,
          typeRessource: TypeRessource.DOCUMENT,
        })
        .expect(200)
        .expect(mockFiles);
    });
  });

  describe('/fichiers/type/:type (GET)', () => {
    it('should get files by type', () => {
      const mockFiles = [
        {
          id: 1,
          filename: 'test.pdf',
          type: TypeFichier.RESSOURCE,
          typeRessource: TypeRessource.QUIZ,
        },
      ];

      mockFichierRepository.find.mockResolvedValue(mockFiles);

      return request(app.getHttpServer())
        .get(`/fichiers/type/${TypeFichier.RESSOURCE}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ typeRessource: TypeRessource.QUIZ })
        .expect(200)
        .expect(mockFiles);
    });
  });
});