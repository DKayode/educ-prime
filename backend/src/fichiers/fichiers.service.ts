import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeFichier, TypeRessource } from './entities/fichier.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource, RessourceType } from '../ressources/entities/ressource.entity';
import { FirebaseConfig } from '../config/firebase.config';
import { FichierUploadData } from './interfaces/fichier-upload-data.interface'; // Changed from CreerFichierDto

@Injectable()
export class FichiersService {
  private readonly logger = new Logger(FichiersService.name);

  constructor(
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
    @InjectRepository(Epreuve)
    private readonly epreuveRepository: Repository<Epreuve>,
    @InjectRepository(Ressource)
    private readonly ressourceRepository: Repository<Ressource>,
    @Inject('FirebaseConfig')
    private readonly firebaseConfig: any, // Changed type to any as per instruction
  ) { }

  private async validateMatiereExists(matiereId: number): Promise<void> {
    const matiere = await this.matiereRepository.findOne({
      where: { id: matiereId }
    });
    if (!matiere) {
      throw new NotFoundException(`Matière avec l'ID ${matiereId} introuvable`);
    }
    this.logger.log(`Validated matiere: ${matiere.nom} (ID: ${matiere.id})`);
  }

  private async createOrGetEpreuve(uploadData: FichierUploadData, professeurId: number): Promise<number> {
    // If epreuveId is provided, validate it exists
    if (uploadData.epreuveId) {
      const epreuve = await this.epreuveRepository.findOne({
        where: { id: uploadData.epreuveId }
      });
      if (!epreuve) {
        throw new NotFoundException(`Épreuve avec l'ID ${uploadData.epreuveId} introuvable`);
      }
      this.logger.log(`Using existing epreuve: ${epreuve.titre} (ID: ${epreuve.id})`);
      return epreuve.id;
    }

    // Create new epreuve without URL
    if (!uploadData.epreuveTitre || !uploadData.dureeMinutes) {
      throw new BadRequestException('epreuveTitre et dureeMinutes sont requis lors de la création d\'une nouvelle épreuve');
    }

    const newEpreuve = this.epreuveRepository.create({
      titre: uploadData.epreuveTitre,
      url: '', // Will be updated after successful upload
      duree_minutes: uploadData.dureeMinutes,
      professeur_id: professeurId,
      matiere_id: uploadData.matiereId,
      date_publication: uploadData.datePublication ? new Date(uploadData.datePublication) : null,
    });

    const savedEpreuve = await this.epreuveRepository.save(newEpreuve);
    this.logger.log(`Created new epreuve: ${savedEpreuve.titre} (ID: ${savedEpreuve.id})`);
    return savedEpreuve.id;
  }

  private async createOrGetRessource(uploadData: FichierUploadData, professeurId: number): Promise<number> {
    // If ressourceId is provided, validate it exists
    if (uploadData.ressourceId) {
      const ressource = await this.ressourceRepository.findOne({
        where: { id: uploadData.ressourceId }
      });
      if (!ressource) {
        throw new NotFoundException(`Ressource avec l'ID ${uploadData.ressourceId} introuvable`);
      }
      this.logger.log(`Using existing ressource: ${ressource.titre} (ID: ${ressource.id})`);
      return ressource.id;
    }

    // Create new ressource without URL
    if (!uploadData.ressourceTitre || !uploadData.typeRessource) {
      throw new BadRequestException('ressourceTitre et typeRessource sont requis lors de la création d\'une nouvelle ressource');
    }

    const newRessource = this.ressourceRepository.create({
      titre: uploadData.ressourceTitre,
      type: this.mapToRessourceType(uploadData.typeRessource),
      url: '',
      professeur_id: professeurId,
      matiere_id: uploadData.matiereId,
    });

    const savedRessource = await this.ressourceRepository.save(newRessource);
    this.logger.log(`Created new ressource: ${savedRessource.titre} (ID: ${savedRessource.id})`);
    return savedRessource.id;
  }

  private mapToRessourceType(type: TypeRessource): RessourceType {
    switch (type) {
      case TypeRessource.DOCUMENT:
        return RessourceType.DOCUMENT;
      case TypeRessource.QUIZ:
        return RessourceType.QUIZ;
      case TypeRessource.EXERCICES:
        return RessourceType.EXERCICES;
      default:
        throw new BadRequestException(`Type de ressource invalide fourni : ${type}`);
    }
  }

  private normalizePathSegment(value: string | number | undefined): string {
    if (value === undefined || value === null) {
      throw new BadRequestException('Segment de chemin invalide rencontré lors de la construction du chemin de stockage');
    }
    return String(value).trim().toLowerCase();
  }

  private normalizeFileName(originalName: string): string {
    return this.normalizePathSegment(originalName).replace(/\s+/g, '-');
  }

  async uploadFile(file: any, utilisateurId: number, uploadData: FichierUploadData): Promise<{ url: string; type: TypeFichier; entityId: number }> {
    let createdEntityId: number | null = null;
    let createdEntityType: 'epreuve' | 'ressource' | null = null;

    try {
      this.logger.log(`Starting file upload process for user ${utilisateurId}`);

      let actualEpreuveId: number | undefined;
      let actualRessourceId: number | undefined;

      // Step 1: Validate matiere and create/get epreuve or ressource
      if (uploadData.type === TypeFichier.EPREUVE) {
        if (!uploadData.matiereId) {
          throw new BadRequestException('matiereId est requis pour une épreuve');
        }
        await this.validateMatiereExists(uploadData.matiereId);

        actualEpreuveId = await this.createOrGetEpreuve(uploadData, utilisateurId);
        if (!uploadData.epreuveId) {
          // We created a new epreuve, track it for rollback
          createdEntityId = actualEpreuveId;
          createdEntityType = 'epreuve';
        }
      } else if (uploadData.type === TypeFichier.RESSOURCE) {
        if (!uploadData.matiereId) {
          throw new BadRequestException('matiereId est requis pour une ressource');
        }
        await this.validateMatiereExists(uploadData.matiereId);

        actualRessourceId = await this.createOrGetRessource(uploadData, utilisateurId);
        if (!uploadData.ressourceId) {
          // We created a new ressource, track it for rollback
          createdEntityId = actualRessourceId;
          createdEntityType = 'ressource';
        }
      }

      // Step 2: Upload file to Firebase Storage
      const storage = this.firebaseConfig.getStorage();
      if (!storage) {
        throw new Error('Service de stockage non disponible');
      }

      const bucket = storage.bucket();
      if (!bucket) {
        throw new Error('Bucket de stockage non disponible');
      }

      let folderPath: string;
      const normalizedFileName = this.normalizeFileName(file.originalname);

      switch (uploadData.type) {
        case TypeFichier.PROFILE:
          folderPath = `utilisateurs/${this.normalizePathSegment(utilisateurId)}/${normalizedFileName}`;
          break;
        case TypeFichier.EPREUVE:
          folderPath = [
            'epreuves',
            this.normalizePathSegment(uploadData.matiereId),
            this.normalizePathSegment(actualEpreuveId),
            normalizedFileName,
          ].join('/');
          break;
        case TypeFichier.RESSOURCE:
          if (!uploadData.typeRessource) {
            throw new BadRequestException('typeRessource est requis pour les ressources');
          }
          folderPath = [
            'ressources',
            this.normalizePathSegment(uploadData.typeRessource),
            this.normalizePathSegment(uploadData.matiereId),
            this.normalizePathSegment(actualRessourceId),
            normalizedFileName,
          ].join('/');
          break;
        default:
          throw new BadRequestException('Type de fichier invalide');
      }

      const fileName = folderPath;
      this.logger.log(`Generated filename: ${fileName}`);

      const fileUpload = bucket.file(fileName);
      if (!fileUpload) {
        throw new Error('Impossible de créer la référence du fichier');
      }

      this.logger.log('Attempting to save file to storage...');
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });
      this.logger.log('File successfully saved to storage');

      const fileUrl = process.env.NODE_ENV === 'test'
        ? `https://storage.mock/${bucket.name}/${fileName}`
        : `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Step 3: Update URL in epreuve or ressource table
      if (uploadData.type === TypeFichier.EPREUVE && actualEpreuveId) {
        await this.epreuveRepository.update({ id: actualEpreuveId }, { url: fileUrl });
        this.logger.log(`Updated epreuve ${actualEpreuveId} with URL: ${fileUrl}`);

        // Return the updated epreuve as a Fichier-like object for compatibility
        const epreuve = await this.epreuveRepository.findOne({ where: { id: actualEpreuveId } });
        return {
          id: epreuve.id,
          url: epreuve.url,
          filename: fileName,
          originalName: file.originalname,
        } as any;
      } else if (uploadData.type === TypeFichier.RESSOURCE && actualRessourceId) {
        await this.ressourceRepository.update({ id: actualRessourceId }, { url: fileUrl });
        this.logger.log(`Updated ressource ${actualRessourceId} with URL: ${fileUrl}`);

        // Return the updated ressource as a Fichier-like object for compatibility
        const ressource = await this.ressourceRepository.findOne({ where: { id: actualRessourceId } });
        return {
          id: ressource.id,
          url: ressource.url,
          filename: fileName,
          originalName: file.originalname,
        } as any;
      }

      // For PROFILE type, just return the URL info
      return {
        id: utilisateurId,
        url: fileUrl,
        filename: fileName,
        originalName: file.originalname,
      } as any;
    } catch (error) {
      this.logger.error('Error during file upload:', error);

      // Rollback: Delete created entity if upload failed
      if (createdEntityId && createdEntityType) {
        this.logger.warn(`Rolling back created ${createdEntityType} with ID ${createdEntityId}`);
        try {
          if (createdEntityType === 'epreuve') {
            await this.epreuveRepository.delete({ id: createdEntityId });
          } else if (createdEntityType === 'ressource') {
            await this.ressourceRepository.delete({ id: createdEntityId });
          }
          this.logger.log(`Successfully rolled back ${createdEntityType} ${createdEntityId}`);
        } catch (rollbackError) {
          this.logger.error(`Failed to rollback ${createdEntityType} ${createdEntityId}:`, rollbackError);
        }
      }

      throw error;
    }
  }

  async downloadFile(fileUrl: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    try {
      // Extract file path from Firebase Storage URL
      const bucket = this.firebaseConfig.getBucket();
      const bucketName = bucket.name;
      const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${bucketName}/(.+)`);
      const match = fileUrl.match(urlPattern);

      if (!match) {
        throw new BadRequestException('Invalid Firebase Storage URL');
      }

      const filePath = decodeURIComponent(match[1]);
      const file = bucket.file(filePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new NotFoundException('File not found in storage');
      }

      // Download file
      const [buffer] = await file.download();

      // Get metadata for content type
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || 'application/octet-stream';

      // Extract filename from path
      const filename = filePath.split('/').pop() || 'download';

      return { buffer, contentType, filename };
    } catch (error) {
      this.logger.error('Error downloading file:', error);
      throw error;
    }
  }
}