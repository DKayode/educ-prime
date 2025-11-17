import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeFichier, TypeRessource } from './entities/fichier.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource, RessourceType } from '../ressources/entities/ressource.entity';
import { FirebaseConfig } from '../config/firebase.config';
import { CreerFichierDto } from './dto/creer-fichier.dto';

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
    private readonly firebaseConfig: FirebaseConfig,
  ) {}

  private async validateMatiereExists(matiereId: number): Promise<void> {
    const matiere = await this.matiereRepository.findOne({ 
      where: { id: matiereId } 
    });
    if (!matiere) {
      throw new NotFoundException(`Matière avec l'ID ${matiereId} introuvable`);
    }
    this.logger.log(`Validated matiere: ${matiere.nom} (ID: ${matiere.id})`);
  }

  private async createOrGetEpreuve(creerFichierDto: CreerFichierDto, professeurId: number): Promise<number> {
    // If epreuveId is provided, validate it exists
    if (creerFichierDto.epreuveId) {
      const epreuve = await this.epreuveRepository.findOne({ 
        where: { id: creerFichierDto.epreuveId } 
      });
      if (!epreuve) {
        throw new NotFoundException(`Épreuve avec l'ID ${creerFichierDto.epreuveId} introuvable`);
      }
      this.logger.log(`Using existing epreuve: ${epreuve.titre} (ID: ${epreuve.id})`);
      return epreuve.id;
    }

    // Create new epreuve without URL
    if (!creerFichierDto.epreuveTitre || !creerFichierDto.dureeMinutes) {
      throw new BadRequestException('epreuveTitre et dureeMinutes sont requis lors de la création d\'une nouvelle épreuve');
    }

    const newEpreuve = this.epreuveRepository.create({
      titre: creerFichierDto.epreuveTitre,
      url: '', // Will be updated after successful upload
      duree_minutes: creerFichierDto.dureeMinutes,
      professeur_id: professeurId,
      matiere_id: creerFichierDto.matiereId,
    });

    const savedEpreuve = await this.epreuveRepository.save(newEpreuve);
    this.logger.log(`Created new epreuve: ${savedEpreuve.titre} (ID: ${savedEpreuve.id})`);
    return savedEpreuve.id;
  }

  private async createOrGetRessource(creerFichierDto: CreerFichierDto, professeurId: number): Promise<number> {
    // If ressourceId is provided, validate it exists
    if (creerFichierDto.ressourceId) {
      const ressource = await this.ressourceRepository.findOne({ 
        where: { id: creerFichierDto.ressourceId } 
      });
      if (!ressource) {
        throw new NotFoundException(`Ressource avec l'ID ${creerFichierDto.ressourceId} introuvable`);
      }
      this.logger.log(`Using existing ressource: ${ressource.titre} (ID: ${ressource.id})`);
      return ressource.id;
    }

    // Create new ressource without URL
    if (!creerFichierDto.ressourceTitre || !creerFichierDto.typeRessource) {
      throw new BadRequestException('ressourceTitre et typeRessource sont requis lors de la création d\'une nouvelle ressource');
    }

    const newRessource = this.ressourceRepository.create({
      titre: creerFichierDto.ressourceTitre,
      type: this.mapToRessourceType(creerFichierDto.typeRessource),
      url: '',
      professeur_id: professeurId,
      matiere_id: creerFichierDto.matiereId,
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

  async uploadFile(file: any, utilisateurId: number, creerFichierDto: CreerFichierDto): Promise<{ url: string; type: TypeFichier; entityId: number }> {
    let createdEntityId: number | null = null;
    let createdEntityType: 'epreuve' | 'ressource' | null = null;

    try {
      this.logger.log(`Starting file upload process for user ${utilisateurId}`);

      let actualEpreuveId: number | undefined;
      let actualRessourceId: number | undefined;

      // Step 1: Validate matiere and create/get epreuve or ressource
      if (creerFichierDto.type === TypeFichier.EPREUVE) {
        if (!creerFichierDto.matiereId) {
          throw new BadRequestException('matiereId est requis pour une épreuve');
        }
        await this.validateMatiereExists(creerFichierDto.matiereId);
        
        actualEpreuveId = await this.createOrGetEpreuve(creerFichierDto, utilisateurId);
        if (!creerFichierDto.epreuveId) {
          // We created a new epreuve, track it for rollback
          createdEntityId = actualEpreuveId;
          createdEntityType = 'epreuve';
        }
      } else if (creerFichierDto.type === TypeFichier.RESSOURCE) {
        if (!creerFichierDto.matiereId) {
          throw new BadRequestException('matiereId est requis pour une ressource');
        }
        await this.validateMatiereExists(creerFichierDto.matiereId);
        
        actualRessourceId = await this.createOrGetRessource(creerFichierDto, utilisateurId);
        if (!creerFichierDto.ressourceId) {
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

      switch (creerFichierDto.type) {
        case TypeFichier.PROFILE:
          folderPath = `utilisateurs/${this.normalizePathSegment(utilisateurId)}/${normalizedFileName}`;
          break;
        case TypeFichier.EPREUVE:
          folderPath = [
            'epreuves',
            this.normalizePathSegment(creerFichierDto.matiereId),
            this.normalizePathSegment(actualEpreuveId),
            normalizedFileName,
          ].join('/');
          break;
        case TypeFichier.RESSOURCE:
          if (!creerFichierDto.typeRessource) {
            throw new BadRequestException('typeRessource est requis pour les ressources');
          }
          folderPath = [
            'ressources',
            this.normalizePathSegment(creerFichierDto.typeRessource),
            this.normalizePathSegment(creerFichierDto.matiereId),
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
      if (creerFichierDto.type === TypeFichier.EPREUVE && actualEpreuveId) {
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
      } else if (creerFichierDto.type === TypeFichier.RESSOURCE && actualRessourceId) {
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