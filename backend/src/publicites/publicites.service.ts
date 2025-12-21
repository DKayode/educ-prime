import { Injectable, NotFoundException, Logger, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Publicite } from './entities/publicite.entity';
import { FichiersService } from '../fichiers/fichiers.service';
import { CreerPubliciteDto } from './dto/creer-publicite.dto';
import { MajPubliciteDto } from './dto/maj-publicite.dto';
import { FilterPubliciteDto } from './dto/filter-publicite.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class PublicitesService {
    private readonly logger = new Logger(PublicitesService.name);

    constructor(
        @InjectRepository(Publicite)
        private readonly publiciteRepository: Repository<Publicite>,
        private readonly fichiersService: FichiersService,
    ) { }

    async create(creerPubliciteDto: CreerPubliciteDto) {
        this.logger.log(`Création d'une publicité: ${creerPubliciteDto.titre}`);
        const newPublicite = this.publiciteRepository.create(creerPubliciteDto);
        const saved = await this.publiciteRepository.save(newPublicite);
        this.logger.log(`Publicité créée: ${saved.titre} (ID: ${saved.id})`);
        return saved;
    }

    async findAll(filterDto: FilterPubliciteDto): Promise<PaginationResponse<Publicite>> {
        const { page = 1, limit = 10, titre } = filterDto;
        this.logger.log(`Récupération des publicités - Page: ${page}, Limite: ${limit}, Titre: ${titre}`);

        const where: any = {};
        if (titre) {
            where.titre = Like(`%${titre}%`);
        }

        const [publicites, total] = await this.publiciteRepository.findAndCount({
            where,
            order: { ordre: 'ASC', date_creation: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        this.logger.log(`${publicites.length} publicité(s) trouvée(s) sur ${total} total`);

        return {
            data: publicites,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string) {
        this.logger.log(`Recherche de la publicité ID: ${id}`);
        const publicite = await this.publiciteRepository.findOne({
            where: { id: parseInt(id) },
        });

        if (!publicite) {
            this.logger.warn(`Publicité ID ${id} introuvable`);
            throw new NotFoundException('Publicité non trouvée');
        }

        this.logger.log(`Publicité trouvée: ${publicite.titre} (ID: ${id})`);
        return publicite;
    }

    async findOneForDownload(id: string): Promise<{ url: string; titre: string }> {
        this.logger.log(`Recherche de la publicité pour téléchargement - ID: ${id}`);
        const publicite = await this.publiciteRepository.findOne({
            where: { id: parseInt(id) },
        });

        if (!publicite) {
            this.logger.warn(`Publicité ID ${id} introuvable`);
            throw new NotFoundException('Publicité non trouvée');
        }

        if (!publicite.media) {
            this.logger.warn(`Publicité ID ${id} n'a pas de fichier média associé`);
            throw new BadRequestException('Cette publicité n\'a pas de fichier média associé');
        }

        this.logger.log(`Publicité trouvée pour téléchargement: ${publicite.titre} (ID: ${id})`);
        return { url: publicite.media, titre: publicite.titre };
    }

    async findOneForDownloadMedia(id: string): Promise<{ url: string; titre: string }> {
        return this.findOneForDownload(id);
    }

    async findOneForDownloadImage(id: string): Promise<{ url: string; titre: string }> {
        this.logger.log(`Recherche de l'image de la publicité pour téléchargement - ID: ${id}`);
        const publicite = await this.publiciteRepository.findOne({
            where: { id: parseInt(id) },
        });

        if (!publicite) {
            this.logger.warn(`Publicité ID ${id} introuvable`);
            throw new NotFoundException('Publicité non trouvée');
        }

        if (!publicite.image) {
            this.logger.warn(`Publicité ID ${id} n'a pas d'image associée`);
            throw new BadRequestException('Cette publicité n\'a pas d\'image associée');
        }

        this.logger.log(`Image trouvée pour téléchargement: ${publicite.titre} (ID: ${id})`);
        return { url: publicite.image, titre: publicite.titre };
    }

    async update(id: string, majPubliciteDto: MajPubliciteDto) {
        this.logger.log(`Mise à jour de la publicité ID: ${id}`);
        const publicite = await this.publiciteRepository.findOne({
            where: { id: parseInt(id) },
        });

        if (!publicite) {
            this.logger.warn(`Mise à jour échouée: publicité ID ${id} introuvable`);
            throw new NotFoundException('Publicité non trouvée');
        }

        Object.assign(publicite, majPubliciteDto);
        const updated = await this.publiciteRepository.save(publicite);
        this.logger.log(`Publicité mise à jour: ${updated.titre} (ID: ${id})`);
        return updated;
    }

    async remove(id: string) {
        this.logger.log(`Suppression de la publicité ID: ${id}`);
        const publicite = await this.publiciteRepository.findOne({
            where: { id: parseInt(id) },
        });

        if (!publicite) {
            this.logger.warn(`Suppression échouée: publicité ID ${id} introuvable`);
            throw new NotFoundException('Publicité non trouvée');
        }

        if (publicite.image) {
            await this.fichiersService.deleteFile(publicite.image);
        }
        if (publicite.media) {
            await this.fichiersService.deleteFile(publicite.media);
        }

        await this.publiciteRepository.remove(publicite);
        this.logger.log(`Publicité supprimée: ${publicite.titre} (ID: ${id})`);
        return { message: 'Publicité supprimée avec succès' };
    }
}
