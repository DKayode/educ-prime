import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Avis } from './entities/avis.entity';
import { Service } from '../services/entities/service.entity';
import { Offre } from '../offres/entities/offre.entity';
import { EntiteType } from '../common/enums/entite-type.enum';
import { CreateAvisDto, UpdateAvisDto } from './dto/avis.dto';
import { DataSourceResolver } from '../config/data-source-resolver.service';

@Injectable()
export class AvisService {
    constructor(
        private readonly resolver: DataSourceResolver,
    ) { }

    private get avisRepository(): Repository<Avis> { return this.resolver.getRepository(Avis); }
    private get servicesRepository(): Repository<Service> { return this.resolver.getRepository(Service); }
    private get offresRepository(): Repository<Offre> { return this.resolver.getRepository(Offre); }

    async create(userId: number, createAvisDto: CreateAvisDto) {
        const { avisable_id, avisable_type, note, comment } = createAvisDto;

        let targetEntity: Service | Offre | null = null;
        if (avisable_type === EntiteType.SERVICES) {
            targetEntity = await this.servicesRepository.findOne({ where: { id: avisable_id } });
        } else if (avisable_type === EntiteType.OFFRES) {
            targetEntity = await this.offresRepository.findOne({ where: { id: avisable_id } });
        }

        if (!targetEntity) {
            throw new NotFoundException(`${avisable_type} introuvable.`);
        }

        if (targetEntity.utilisateur_id === userId) {
            throw new ForbiddenException(`Vous ne pouvez pas noter votre propre ${avisable_type.toLowerCase()}.`);
        }

        const existingAvis = await this.avisRepository.findOne({
            where: { avisable_id, avisable_type, utilisateur_id: userId },
        });

        if (existingAvis) {
            throw new ForbiddenException(`Vous avez déjà laissé un avis pour ce ${avisable_type.toLowerCase()}.`);
        }

        const avis = this.avisRepository.create({
            note,
            comment,
            avisable_id,
            avisable_type,
            utilisateur_id: userId,
        });
        return this.avisRepository.save(avis);
    }

    async findAllByModel(model: string, id: number, pagination: { page: number, limit: number }) {
        let entityType: EntiteType;
        if (model.toLowerCase() === 'services') {
            entityType = EntiteType.SERVICES;
        } else if (model.toLowerCase() === 'offres') {
            entityType = EntiteType.OFFRES;
        } else {
            throw new BadRequestException('Modèle invalide. Utilisez "Services" ou "Offres".');
        }
        return this.findAllByEntity(id, entityType, pagination);
    }

    private async findAllByEntity(entityId: number, entityType: EntiteType, pagination: { page: number, limit: number }) {
        const { page, limit } = pagination;

        const [avisList, total] = await this.avisRepository.findAndCount({
            where: { avisable_id: entityId, avisable_type: entityType },
            relations: ['utilisateur'],
            skip: (page - 1) * limit,
            take: limit,
            order: { created_at: 'DESC' },
        });

        const enrichedAvis = avisList.map((avis) => {
            const { utilisateur_id, utilisateur, ...restAvis } = avis;
            return {
                ...restAvis,
                utilisateur: utilisateur ? {
                    id: utilisateur.id,
                    ui: utilisateur.uuid,
                    nom: utilisateur.nom,
                    prenom: utilisateur.prenom,
                    email: utilisateur.email,
                } : null,
            };
        });

        return {
            data: enrichedAvis,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const avis = await this.avisRepository.findOne({ where: { id } });
        if (!avis) {
            throw new NotFoundException(`Avis #${id} introuvable`);
        }
        return avis;
    }

    async update(id: number, userId: number, updateAvisDto: UpdateAvisDto) {
        const avis = await this.findOne(id);

        if (avis.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cet avis.");
        }

        if (updateAvisDto.note !== undefined) avis.note = updateAvisDto.note;
        if (updateAvisDto.comment !== undefined) avis.comment = updateAvisDto.comment;
        await this.avisRepository.save(avis);

        return { message: 'Avis mis à jour avec succès.' };
    }

    async remove(id: number, userId: number) {
        const avis = await this.findOne(id);

        if (avis.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cet avis.");
        }

        await this.avisRepository.remove(avis);
        return { message: 'Avis supprimé avec succès.' };
    }
}
