import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publicite } from './entities/publicite.entity';
import { CreerPubliciteDto } from './dto/creer-publicite.dto';
import { MajPubliciteDto } from './dto/maj-publicite.dto';

@Injectable()
export class PublicitesService {
    private readonly logger = new Logger(PublicitesService.name);

    constructor(
        @InjectRepository(Publicite)
        private readonly publiciteRepository: Repository<Publicite>,
    ) { }

    async create(creerPubliciteDto: CreerPubliciteDto) {
        this.logger.log(`Création d'une publicité: ${creerPubliciteDto.titre}`);
        const newPublicite = this.publiciteRepository.create(creerPubliciteDto);
        const saved = await this.publiciteRepository.save(newPublicite);
        this.logger.log(`Publicité créée: ${saved.titre} (ID: ${saved.id})`);
        return saved;
    }

    async findAll() {
        this.logger.log('Récupération de toutes les publicités');
        const publicites = await this.publiciteRepository.find({
            order: { ordre: 'ASC', date_creation: 'DESC' },
        });
        this.logger.log(`${publicites.length} publicité(s) trouvée(s)`);
        return publicites;
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

        await this.publiciteRepository.remove(publicite);
        this.logger.log(`Publicité supprimée: ${publicite.titre} (ID: ${id})`);
        return { message: 'Publicité supprimée avec succès' };
    }
}
