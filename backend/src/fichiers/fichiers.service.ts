import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeFichier, TypeRessource } from './entities/fichier.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { Epreuve } from '../epreuves/entities/epreuve.entity';
import { Ressource, RessourceType } from '../ressources/entities/ressource.entity';
import { FirebaseConfig } from '../config/firebase.config';
import { FichierUploadData } from './interfaces/fichier-upload-data.interface';
import * as sharp from 'sharp';

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
    private readonly firebaseConfig: any,
  ) { }

  private async compressImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true }) // Limit max width
        .jpeg({ quality: 80, mozjpeg: true }) // Compress as JPEG
        .toBuffer();
    } catch (error) {
      this.logger.warn('Image compression failed, using original file:', error);
      return buffer;
    }
  }

  private async validateMatiereExists(matiereId: number): Promise<void> {
    const matiere = await this.matiereRepository.findOne({
      where: { id: matiereId }
    });
    if (!matiere) {
      throw new NotFoundException(`Matière avec l'ID ${matiereId} introuvable`);
    }
    this.logger.log(`Validated matiere: ${matiere.nom} (ID: ${matiere.id})`);
  }

  private async createOrGetEpreuve(uploadData: FichierUploadData, professeurId: number): Promise<Epreuve> {
    // If epreuveId is provided, validate it exists
    if (uploadData.epreuveId) {
      const epreuve = await this.epreuveRepository.findOne({
        where: { id: uploadData.epreuveId }
      });
      if (!epreuve) {
        throw new NotFoundException(`Épreuve avec l'ID ${uploadData.epreuveId} introuvable`);
      }
      this.logger.log(`Using existing epreuve: ${epreuve.titre} (ID: ${epreuve.id})`);
      return epreuve;
    }

    // Create new epreuve without URL
    if (!uploadData.epreuveTitre) {
      throw new BadRequestException('epreuveTitre est requis lors de la création d\'une nouvelle épreuve');
    }

    const newEpreuve = this.epreuveRepository.create({
      titre: uploadData.epreuveTitre,
      type: uploadData.epreuveType, // Set the type from upload data
      url: '', // Will be updated after successful upload
      duree_minutes: uploadData.dureeMinutes,
      nombre_pages: uploadData.nombrePages || 0,
      professeur_id: professeurId,
      matiere_id: uploadData.matiereId,
      date_publication: uploadData.datePublication ? new Date(uploadData.datePublication) : null,
    });

    const savedEpreuve = await this.epreuveRepository.save(newEpreuve);
    this.logger.log(`Created new epreuve: ${savedEpreuve.titre} (ID: ${savedEpreuve.id})`);
    return savedEpreuve;
  }

  private async createOrGetRessource(uploadData: FichierUploadData, professeurId: number): Promise<Ressource> {
    // If ressourceId is provided, validate it exists
    if (uploadData.ressourceId) {
      const ressource = await this.ressourceRepository.findOne({
        where: { id: uploadData.ressourceId }
      });
      if (!ressource) {
        throw new NotFoundException(`Ressource avec l'ID ${uploadData.ressourceId} introuvable`);
      }
      this.logger.log(`Using existing ressource: ${ressource.titre} (ID: ${ressource.id})`);
      return ressource;
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
      nombre_pages: uploadData.nombrePages || 0,
    });

    const savedRessource = await this.ressourceRepository.save(newRessource);
    this.logger.log(`Created new ressource: ${savedRessource.titre} (ID: ${savedRessource.id})`);
    return savedRessource;
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
    let fileBuffer = file.buffer;
    let contentType = file.mimetype;

    // Compress image if applicable
    if (file.mimetype.startsWith('image/')) {
      this.logger.log(`Compressing image: ${file.originalname}`);
      fileBuffer = await this.compressImage(file.buffer);
      // We convert everything to jpeg in compression for consistency, or we could keep original format.
      // My implementation above converts to jpeg. So let's update contentType and filename extension if needed.
      // However, to be safe and simple: strict conversion to jpeg might be aggressive.
      // Let's stick to the plan: "Quality 80%, WebP or JPEG".
      // If I change the mime type I should update the filename too.
      // For simplicity towards the user plan "keep it simple", I will just compress and keep buffer.
      // If I use .jpeg() in sharp, output is jpeg.
      contentType = 'image/jpeg';
    }

    try {
      this.logger.log(`Starting file upload process for user ${utilisateurId}`);

      let actualEpreuveId: number | undefined;
      let actualRessourceId: number | undefined;

      // ... rest of method

      // Step 1: Validate matiere and create/get epreuve or ressource
      if (uploadData.type === TypeFichier.EPREUVE) {
        if (!uploadData.matiereId) {
          throw new BadRequestException('matiereId est requis pour une épreuve');
        }
        if (!uploadData.epreuveId && !uploadData.epreuveType) {
          throw new BadRequestException('epreuveType (Interrogation, Devoirs, etc.) est requis pour créer une épreuve');
        }
        await this.validateMatiereExists(uploadData.matiereId);

        const epreuve = await this.createOrGetEpreuve(uploadData, utilisateurId);
        actualEpreuveId = epreuve.id;

        if (!uploadData.epreuveId) {
          // We created a new epreuve, track it for rollback
          createdEntityId = actualEpreuveId;
          createdEntityType = 'epreuve';
        }

        // Store reference to type for path generation
        uploadData.epreuveType = epreuve.type;
      } else if (uploadData.type === TypeFichier.RESSOURCE) {
        if (!uploadData.matiereId) {
          throw new BadRequestException('matiereId est requis pour une ressource');
        }
        await this.validateMatiereExists(uploadData.matiereId);

        const ressource = await this.createOrGetRessource(uploadData, utilisateurId);
        actualRessourceId = ressource.id;

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
      // If we compressed to jpeg, ensure extension is jpg
      let originalName = file.originalName || file.originalname;
      if (contentType === 'image/jpeg' && !originalName.endsWith('.jpg') && !originalName.endsWith('.jpeg')) {
        const parts = originalName.split('.');
        if (parts.length > 1) parts.pop();
        originalName = parts.join('.') + '.jpg';
      }
      let normalizedFileName = this.normalizeFileName(originalName);

      // Force unique filename for Evenements and Opportunites to avoid caching issues
      if (uploadData.type === TypeFichier.EVENEMENT || uploadData.type === TypeFichier.OPPORTUNITE) {
        const parts = normalizedFileName.split('.');
        if (parts.length > 1) {
          const ext = parts.pop();
          const base = parts.join('.');
          normalizedFileName = `${base}-${Date.now()}.${ext}`;
        } else {
          normalizedFileName = `${normalizedFileName}-${Date.now()}`;
        }
      }

      switch (uploadData.type) {
        case TypeFichier.PROFILE:
          folderPath = `utilisateurs/${this.normalizePathSegment(utilisateurId)}/${normalizedFileName}`;
          break;
        case TypeFichier.EPREUVE:
          folderPath = [
            'epreuves',
            this.normalizePathSegment(uploadData.epreuveType),
            this.normalizePathSegment(actualEpreuveId),
            normalizedFileName,
          ].join('/');
          break;
        case TypeFichier.RESSOURCE:
          if (!uploadData.typeRessource) {
            // fallback if typeRessource is missing but needed
            // In createOrGetRessource we validated/mapped it. 
            // Ideally we should have it in uploadData. If not (update case), we might need to fetch it?
            // But for now, require it or rely on what's passed.
            // If uploadData.typeRessource is missing here, path generation fails. 
            throw new BadRequestException('typeRessource est requis pour les ressources');
          }
          folderPath = [
            'ressources',
            this.normalizePathSegment(uploadData.typeRessource),
            this.normalizePathSegment(actualRessourceId),
            normalizedFileName,
          ].join('/');
          break;
        case TypeFichier.PUBLICITE:
          if (!uploadData.entityId || !uploadData.entitySubtype) {
            throw new BadRequestException('entityId et entitySubtype sont requis pour les publicités');
          }
          folderPath = `publicites/${this.normalizePathSegment(uploadData.entityId)}/${this.normalizePathSegment(uploadData.entitySubtype)}/${normalizedFileName}`;
          break;
        case TypeFichier.EVENEMENT:
          if (!uploadData.entityId) {
            throw new BadRequestException('entityId est requis pour les événements');
          }
          folderPath = `evenements/${this.normalizePathSegment(uploadData.entityId)}/${normalizedFileName}`;
          break;
        case TypeFichier.OPPORTUNITE:
          if (!uploadData.entityId || !uploadData.entitySubtype) {
            throw new BadRequestException('entityId et entitySubtype (bourses/stages) sont requis pour les opportunités');
          }
          folderPath = `opportunites/${this.normalizePathSegment(uploadData.entitySubtype)}/${this.normalizePathSegment(uploadData.entityId)}/${normalizedFileName}`;
          break;
        case TypeFichier.CONCOURS:
          if (!uploadData.entityId) {
            throw new BadRequestException('entityId est requis pour les concours/examens');
          }
          folderPath = `concours/${this.normalizePathSegment(uploadData.entityId)}/${normalizedFileName}`;
          break;
        case TypeFichier.ETABLISSEMENT:
          if (!uploadData.entityId) {
            throw new BadRequestException('entityId est requis pour les établissements');
          }
          folderPath = `etablissements/${this.normalizePathSegment(uploadData.entityId)}/${normalizedFileName}`;
          break;
        case TypeFichier.PARCOURS:
          if (!uploadData.entityId) {
            throw new BadRequestException('entityId est requis pour les parcours');
          }
          // Use subtype if provided (image/video), otherwise just entity folder
          const parcoursSubPath = uploadData.entitySubtype ? `/${this.normalizePathSegment(uploadData.entitySubtype)}` : '';
          folderPath = `parcours/${this.normalizePathSegment(uploadData.entityId)}${parcoursSubPath}/${normalizedFileName}`;
          break;
        case TypeFichier.CATEGORIES:
          if (!uploadData.entityId) {
            throw new BadRequestException('entityId est requis pour les catégories');
          }
          folderPath = `categories/${this.normalizePathSegment(uploadData.entityId)}/${normalizedFileName}`;
          break;
        case TypeFichier.FORUMS:
          if (!uploadData.entityId) {
            throw new BadRequestException('entityId est requis pour les forums');
          }
          folderPath = `forums/${this.normalizePathSegment(uploadData.entityId)}/${normalizedFileName}`;
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
      await fileUpload.save(fileBuffer, {
        metadata: {
          contentType: contentType,
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

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl) return;

      const bucket = this.firebaseConfig.getBucket();
      const bucketName = bucket.name;
      const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${bucketName}/(.+)`);
      const match = fileUrl.match(urlPattern);

      if (!match) {
        this.logger.warn(`Skipping delete: Invalid Firebase Storage URL format: ${fileUrl}`);
        return;
      }

      const filePath = decodeURIComponent(match[1]);
      const file = bucket.file(filePath);

      this.logger.log(`Attempting to delete file: ${filePath}`);

      const [exists] = await file.exists();
      if (!exists) {
        this.logger.warn(`File not found in storage, skipping delete: ${filePath}`);
        return;
      }

      await file.delete();
      this.logger.log(`File successfully deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${fileUrl}`, error);
      // We don't throw here to ensure one failure doesn't block other cleanup tasks
    }
  }
}