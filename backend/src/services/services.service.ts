import { Injectable, ForbiddenException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Brackets, ILike, In, Repository } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { Service } from './entities/service.entity';
import { Type } from '../types/entities/type.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { Prestataire } from '../prestataires/entities/prestataire.entity';
import { Avis } from '../avis/entities/avis.entity';
import { ServiceStatusEnum } from '../common/enums/service-status.enum';
import { EntiteType } from '../common/enums/entite-type.enum';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { MailService } from '../mail/mail.service';
import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';

export interface ServiceFilterDto {
    localisation?: string;
    type?: string;
    tarifMin?: number;
    tarifMax?: number;
    search?: string;
    page?: number;
    limit?: number;
}

export interface AvisStats {
    moyenne: number;
    total: number;
}

@Injectable()
export class ServicesService {
    private readonly logger = new Logger(ServicesService.name);

    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly mailService: MailService,
        private readonly fichiersService: FichiersService,
    ) { }

    private get servicesRepository(): Repository<Service> { return this.resolver.getRepository(Service); }
    private get typesRepository(): Repository<Type> { return this.resolver.getRepository(Type); }
    private get utilisateursRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }
    private get prestatairesRepository(): Repository<Prestataire> { return this.resolver.getRepository(Prestataire); }
    private get avisRepository(): Repository<Avis> { return this.resolver.getRepository(Avis); }

    private async getAvisStats(serviceId: number): Promise<AvisStats> {
        const row = await this.avisRepository.createQueryBuilder('avis')
            .select('AVG(avis.note)', 'avg_note')
            .addSelect('COUNT(avis.id)', 'total')
            .where('avis.avisable_type = :type', { type: EntiteType.SERVICES })
            .andWhere('avis.avisable_id = :id', { id: serviceId })
            .getRawOne<{ avg_note: string | null, total: string }>();

        return {
            moyenne: row?.avg_note ? parseFloat(Number(row.avg_note).toFixed(1)) : 0,
            total: parseInt(row?.total ?? '0', 10),
        };
    }

    private async getManyAvisStats(serviceIds: number[]): Promise<Map<number, AvisStats>> {
        if (!serviceIds.length) return new Map();
        const rows = await this.avisRepository.createQueryBuilder('avis')
            .select('avis.avisable_id', 'avisable_id')
            .addSelect('AVG(avis.note)', 'avg_note')
            .addSelect('COUNT(avis.id)', 'total')
            .where('avis.avisable_type = :type', { type: EntiteType.SERVICES })
            .andWhere('avis.avisable_id IN (:...ids)', { ids: serviceIds })
            .groupBy('avis.avisable_id')
            .getRawMany<{ avisable_id: string | number, avg_note: string | null, total: string }>();

        return new Map(rows.map(r => [Number(r.avisable_id), {
            moyenne: r.avg_note ? parseFloat(Number(r.avg_note).toFixed(1)) : 0,
            total: parseInt(r.total, 10),
        }]));
    }

    private async formatService(service: Service | null) {
        if (!service) return service;
        const avis = await this.getAvisStats(service.id);
        return this.toClientShape(service, avis);
    }

    private async formatManyServices(services: Service[]) {
        if (!services.length) return [];
        const ids = services.map(s => s.id);
        const avisMap = await this.getManyAvisStats(ids);
        return services.map(s => this.toClientShape(s, avisMap.get(s.id) ?? { moyenne: 0, total: 0 }));
    }

    private toClientShape(service: Service, avis: AvisStats) {
        const { type_id, type, utilisateur, ...rest } = service;
        let prestataire = null;
        if (utilisateur?.prestataire) {
            const { utilisateur_id: _uid, ...prestataireRest } = utilisateur.prestataire;
            prestataire = {
                ...prestataireRest,
                uuid: utilisateur.uuid,
                utilisateur: {
                    id: utilisateur.id,
                    uuid: utilisateur.uuid,
                    nom: utilisateur.nom,
                    prenom: utilisateur.prenom,
                    email: utilisateur.email,
                },
            };
        }
        return {
            ...rest,
            utilisateur_id: service.utilisateur_id,
            type: type ?? null,
            utilisateur: utilisateur ? {
                id: utilisateur.id,
                uuid: utilisateur.uuid,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                email: utilisateur.email,
            } : null,
            prestataire,
            avis,
        };
    }

    private servicesWithRelations() {
        return this.servicesRepository.createQueryBuilder('service')
            .leftJoinAndSelect('service.type', 'type')
            .leftJoinAndSelect('service.utilisateur', 'utilisateur')
            .leftJoinAndSelect('utilisateur.prestataire', 'prestataire')
            .leftJoinAndSelect('prestataire.competences', 'competences');
    }

    async create(pays: string, userId: number, createServiceDto: CreateServiceDto) {
        const user = await this.utilisateursRepository.findOne({ where: { id: userId } });
        if (!user || !user.verifier) {
            throw new ForbiddenException('Vous devez vérifier votre adresse email pour poster un service.');
        }

        const prestataire = await this.prestatairesRepository.findOne({ where: { utilisateur_id: userId } });
        if (!prestataire) {
            throw new ForbiddenException('Réservé aux prestataires. Vous devez créer un profil prestataire pour proposer un service.');
        }

        const { type, type_id, ...serviceData } = createServiceDto;
        let finalTypeId = type_id;

        if (!finalTypeId) {
            if (!type) {
                throw new BadRequestException("Vous devez fournir un 'type_id' ou un 'type' (slug) pour le service.");
            }
            const resolvedType = await this.typesRepository.findOne({ where: { slug: type } });
            if (!resolvedType) {
                throw new BadRequestException(`Le type de service "${type}" est introuvable.`);
            }
            finalTypeId = resolvedType.id;
        }

        const service: Service = this.servicesRepository.create({
            ...serviceData,
            pays,
            type_id: finalTypeId,
            utilisateur_id: userId,
        } as Partial<Service>);
        return this.servicesRepository.save(service);
    }

    async findAll(pays: string, filters: ServiceFilterDto) {
        const { localisation, type, tarifMin, tarifMax, search, page = 1, limit = 10 } = filters;

        const qb = this.servicesWithRelations()
            .where('service.pays = :pays', { pays })
            .andWhere('service.status IN (:...statuses)', { statuses: [ServiceStatusEnum.APPROVED, ServiceStatusEnum.ACTIVE] });

        if (localisation) {
            qb.andWhere('service.localisation ILIKE :localisation', { localisation: `%${localisation}%` });
        }
        if (type) {
            qb.andWhere('type.slug = :typeSlug', { typeSlug: type });
        }
        if (tarifMin !== undefined) {
            qb.andWhere('service.prix >= :tarifMin', { tarifMin });
        }
        if (tarifMax !== undefined) {
            qb.andWhere('service.prix <= :tarifMax', { tarifMax });
        }
        if (search) {
            qb.andWhere(new Brackets(b => {
                b.where('service.titre ILIKE :search', { search: `%${search}%` })
                    .orWhere('service.description ILIKE :search', { search: `%${search}%` });
            }));
        }

        const [data, total] = await qb
            .orderBy('service.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: await this.formatManyServices(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllByUser(pays: string, userId: number, pagination: { page: number, limit: number }) {
        const { page, limit } = pagination;

        const [data, total] = await this.servicesWithRelations()
            .where('service.pays = :pays', { pays })
            .andWhere('service.utilisateur_id = :userId', { userId })
            .orderBy('service.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: await this.formatManyServices(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const service = await this.servicesWithRelations()
            .where('service.id = :id', { id })
            .getOne();

        if (!service) {
            throw new NotFoundException(`Service #${id} introuvable`);
        }
        return this.formatService(service);
    }

    async update(id: number, userId: number, updateServiceDto: UpdateServiceDto) {
        const service = await this.servicesRepository.findOne({ where: { id } });
        if (!service) {
            throw new NotFoundException(`Service #${id} introuvable`);
        }
        if (service.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce service.");
        }

        const { titre, description, prix, localisation, type, type_id, delai, livrable } = updateServiceDto;

        if (type || type_id) {
            let finalTypeId = type_id;
            if (!finalTypeId && type) {
                const resolvedType = await this.typesRepository.findOne({ where: { slug: type } });
                if (!resolvedType) {
                    throw new BadRequestException(`Le type de service "${type}" est introuvable.`);
                }
                finalTypeId = resolvedType.id;
            }
            if (finalTypeId) service.type_id = finalTypeId;
        }

        if (titre !== undefined) service.titre = titre;
        if (description !== undefined) service.description = description;
        if (prix !== undefined) service.prix = prix;
        if (localisation !== undefined) service.localisation = localisation;
        if (delai !== undefined) service.delai = delai;
        if (livrable !== undefined) service.livrable = livrable;
        service.status = ServiceStatusEnum.PENDING_APPROVAL;

        return this.servicesRepository.save(service);
    }

    async uploadImageCouverture(serviceId: number, userId: number, file: Express.Multer.File) {
        const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
        if (!service) {
            throw new NotFoundException(`Service #${serviceId} introuvable`);
        }
        if (service.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier l'image de ce service.");
        }

        const result = await this.fichiersService.uploadFile(file, userId, {
            type: TypeFichier.SERVICE,
            entityId: serviceId,
        } as any);

        service.image_couverture = result.url;
        await this.servicesRepository.save(service);

        return { message: 'Image de couverture mise à jour avec succès', url: result.url };
    }

    async downloadImageCouverture(serviceId: number) {
        const service = await this.servicesRepository.findOne({ where: { id: serviceId } });
        if (!service) {
            throw new NotFoundException(`Service #${serviceId} introuvable`);
        }
        if (!service.image_couverture) {
            throw new NotFoundException('Image de couverture non trouvée pour ce service');
        }
        return this.fichiersService.downloadFile(service.image_couverture);
    }

    async remove(id: number, userId: number, userRole?: string) {
        const service = await this.servicesRepository.findOne({ where: { id } });
        if (!service) {
            throw new NotFoundException(`Service #${id} introuvable`);
        }
        if (service.utilisateur_id !== userId && userRole !== 'admin') {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer ce service.");
        }
        await this.servicesRepository.remove(service);
        return { message: 'Service supprimé avec succès.' };
    }

    async findAllAdmin(pays: string, pagination: { status?: ServiceStatusEnum, page: number, limit: number }) {
        const { status, page, limit } = pagination;
        const qb = this.servicesWithRelations()
            .where('service.pays = :pays', { pays });
        if (status) {
            qb.andWhere('service.status = :status', { status });
        }

        const [data, total] = await qb
            .orderBy('service.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: await this.formatManyServices(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateStatus(id: number, status: ServiceStatusEnum) {
        const service = await this.servicesRepository.findOne({
            where: { id },
            relations: ['utilisateur'],
        });
        if (!service) {
            throw new NotFoundException(`Service #${id} introuvable`);
        }

        const previousStatus = service.status;
        service.status = status;
        await this.servicesRepository.save(service);

        if (previousStatus !== status && service.utilisateur?.email
            && (status === ServiceStatusEnum.ACTIVE || status === ServiceStatusEnum.APPROVED || status === ServiceStatusEnum.DECLINED)) {
            const userName = service.utilisateur.prenom && service.utilisateur.nom
                ? `${service.utilisateur.prenom} ${service.utilisateur.nom}`
                : (service.utilisateur.prenom || service.utilisateur.nom || 'Utilisateur');

            this.mailService.sendServiceStatusUpdateEmail(service.utilisateur.email, userName, service.titre, status)
                .catch(err => this.logger.error(`Failed to send status email for service ${id}: ${err.message}`));
        }

        const formatted = await this.findOne(id);
        return formatted;
    }
}
