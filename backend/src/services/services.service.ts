import { Injectable, ForbiddenException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { services_status_enum } from '@prisma/client';
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

@Injectable()
export class ServicesService {
    private readonly logger = new Logger(ServicesService.name);

    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
        private fichiersService: FichiersService
    ) { }

    private async formatService(service: any) {
        if (!service) return service;
        const { type_id, types, utilisateurs, ...rest } = service;

        const avisAgg = await this.prisma.avis.aggregate({
            where: { avisable_type: 'Services', avisable_id: service.id },
            _avg: { note: true },
            _count: { id: true }
        });

        let prestataire = null;
        if (utilisateurs?.prestataire) {
            const { utilisateur_id, ...prestataireRest } = utilisateurs.prestataire;
            prestataire = {
                ...prestataireRest,
                uuid: utilisateurs.uuid,
                utilisateur: {
                    id: utilisateurs.id,
                    uuid: utilisateurs.uuid,
                    nom: utilisateurs.nom,
                    prenom: utilisateurs.prenom,
                    email: utilisateurs.email
                }
            };
        }

        return {
            ...rest,
            utilisateur_id: service.utilisateur_id,
            type: types,
            prestataire,
            avis: {
                moyenne: avisAgg._avg.note ? parseFloat(Number(avisAgg._avg.note).toFixed(1)) : 0,
                total: avisAgg._count.id
            }
        };
    }

    private async formatManyServices(services: any[]) {
        if (!services.length) return [];
        const serviceIds = services.map(s => s.id);
        const avisAgg = await this.prisma.avis.groupBy({
            by: ['avisable_id'],
            where: { avisable_type: 'Services', avisable_id: { in: serviceIds } },
            _avg: { note: true },
            _count: { id: true }
        });
        const avisMap = new Map(avisAgg.map(a => [a.avisable_id, {
            moyenne: a._avg.note ? parseFloat(Number(a._avg.note).toFixed(1)) : 0,
            total: a._count.id
        }]));

        return services.map(service => {
            const { type_id, types, utilisateurs, ...rest } = service;
            let prestataire = null;
            if (utilisateurs?.prestataire) {
                const { utilisateur_id, ...prestataireRest } = utilisateurs.prestataire;
                prestataire = {
                    ...prestataireRest,
                    uuid: utilisateurs.uuid,
                    utilisateur: {
                        id: utilisateurs.id,
                        uuid: utilisateurs.uuid,
                        nom: utilisateurs.nom,
                        prenom: utilisateurs.prenom,
                        email: utilisateurs.email
                    }
                };
            }
            return {
                ...rest,
                utilisateur_id: service.utilisateur_id,
                type: types,
                prestataire,
                avis: avisMap.get(service.id) || { moyenne: 0, total: 0 }
            };
        });
    }

    async create(userId: number, createServiceDto: CreateServiceDto) {
        // Vérifier si l'email de l'utilisateur est vérifié
        const user = await this.prisma.utilisateurs.findUnique({
            where: { id: userId }
        });

        if (!user || !user.verifier) {
            throw new ForbiddenException("Vous devez vérifier votre adresse email pour poster un service.");
        }

        // Vérifier si l'utilisateur est un prestataire (profil existant)
        const prestataire = await this.prisma.prestataires.findUnique({
            where: { utilisateur_id: userId }
        });

        if (!prestataire) {
            throw new ForbiddenException("Réservé aux prestataires. Vous devez créer un profil prestataire pour proposer un service.");
        }

        const { type, type_id, ...serviceData } = createServiceDto;
        let finalTypeId = type_id;

        // Résolution du type
        if (!finalTypeId) {
            if (!type) {
                throw new BadRequestException("Vous devez fournir un 'type_id' ou un 'type' (slug) pour le service.");
            }

            // Trouver le type par slug
            const resolvedType = await this.prisma.types.findUnique({
                where: { slug: type },
            });

            if (!resolvedType) {
                throw new BadRequestException(`Le type de service "${type}" est introuvable.`);
            }

            finalTypeId = resolvedType.id;
        }

        return this.prisma.services.create({
            data: {
                ...serviceData,
                type_id: finalTypeId as number,
                utilisateur_id: userId,
            } as any
        });
    }

    async findAll(filters: ServiceFilterDto) {
        const { localisation, type, tarifMin, tarifMax, search, page = 1, limit = 10 } = filters;

        // Conditions de base : seulement les statuts valides/actifs
        const whereClause: any = {
            status: {
                in: ['approved', 'active']
            }
        };

        if (localisation) {
            whereClause.localisation = { contains: localisation, mode: 'insensitive' };
        }

        if (type) {
            whereClause.types = { slug: type };
        }

        if (tarifMin !== undefined || tarifMax !== undefined) {
            whereClause.prix = {};
            if (tarifMin !== undefined) whereClause.prix.gte = tarifMin;
            if (tarifMax !== undefined) whereClause.prix.lte = tarifMax;
        }

        if (search) {
            whereClause.OR = [
                { titre: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const total = await this.prisma.services.count({ where: whereClause });
        const data = await this.prisma.services.findMany({
            where: whereClause,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                utilisateurs: {
                    select: {
                        id: true, uuid: true, nom: true, prenom: true, email: true,
                        prestataire: {
                            include: { competences: true }
                        }
                    }
                },
                types: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: await this.formatManyServices(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllByUser(userId: number, pagination: { page: number, limit: number }) {
        const { page, limit } = pagination;
        const whereClause = { utilisateur_id: userId };

        const total = await this.prisma.services.count({ where: whereClause });
        const data = await this.prisma.services.findMany({
            where: whereClause,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { created_at: 'desc' },
            include: {
                utilisateurs: {
                    select: {
                        id: true, uuid: true, nom: true, prenom: true, email: true,
                        prestataire: {
                            include: { competences: true }
                        }
                    }
                },
                types: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            },
        });

        return {
            data: await this.formatManyServices(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const service = await this.prisma.services.findUnique({
            where: { id },
            include: {
                utilisateurs: {
                    select: {
                        id: true, uuid: true, nom: true, prenom: true, email: true,
                        prestataire: {
                            include: { competences: true }
                        }
                    }
                },
                types: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            }
        });

        if (!service) {
            throw new NotFoundException(`Service #${id} introuvable`);
        }

        return this.formatService(service);
    }

    async update(id: number, userId: number, updateServiceDto: UpdateServiceDto) {
        const service = await this.findOne(id);

        if (service.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier ce service.");
        }

        const { titre, description, prix, localisation, type, type_id, delai, livrable } = updateServiceDto;
        const dataToUpdate: any = { status: 'pending_approval' }; // Réinitialiser le statut

        if (type || type_id) {
            let finalTypeId = type_id;
            if (!finalTypeId && type) {
                const resolvedType = await this.prisma.types.findUnique({
                    where: { slug: type },
                });

                if (!resolvedType) {
                    throw new BadRequestException(`Le type de service "${type}" est introuvable.`);
                }
                finalTypeId = resolvedType.id;
            }
            if (finalTypeId) dataToUpdate.type_id = finalTypeId;
        }

        if (titre !== undefined) dataToUpdate.titre = titre;
        if (description !== undefined) dataToUpdate.description = description;
        if (prix !== undefined) dataToUpdate.prix = prix;
        if (localisation !== undefined) dataToUpdate.localisation = localisation;
        if (delai !== undefined) dataToUpdate.delai = delai;
        if (livrable !== undefined) dataToUpdate.livrable = livrable;

        return this.prisma.services.update({
            where: { id },
            data: dataToUpdate as any,
        });
    }

    async uploadImageCouverture(serviceId: number, userId: number, file: Express.Multer.File) {
        const service = await this.findOne(serviceId);

        if (service.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier l'image de ce service.");
        }

        const uploadData = {
            type: TypeFichier.SERVICE,
            entityId: serviceId,
        };

        const result = await this.fichiersService.uploadFile(file, userId, uploadData as any);

        await this.prisma.services.update({
            where: { id: serviceId },
            data: { image_couverture: result.url }
        });

        return { message: 'Image de couverture mise à jour avec succès', url: result.url };
    }

    async downloadImageCouverture(serviceId: number) {
        const service = await this.findOne(serviceId);

        if (!service.image_couverture) {
            throw new NotFoundException('Image de couverture non trouvée pour ce service');
        }

        return this.fichiersService.downloadFile(service.image_couverture);
    }

    async remove(id: number, userId: number, userRole?: string) {
        const service = await this.findOne(id);

        if (service.utilisateur_id !== userId && userRole !== 'admin') {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer ce service.");
        }

        await this.prisma.services.delete({
            where: { id }
        });

        return { message: "Service supprimé avec succès." };
    }

    async findAllAdmin(pagination: { status?: services_status_enum, page: number, limit: number }) {
        const { status, page, limit } = pagination;
        const whereClause: any = {};

        if (status) {
            whereClause.status = status;
        }

        const total = await this.prisma.services.count({ where: whereClause });
        const data = await this.prisma.services.findMany({
            where: whereClause,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                utilisateurs: {
                    select: {
                        id: true, uuid: true, nom: true, prenom: true, email: true,
                        prestataire: {
                            include: { competences: true }
                        }
                    }
                },
                types: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: await this.formatManyServices(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateStatus(id: number, status: services_status_enum) {
        const service = await this.findOne(id);

        const updatedService = await this.prisma.services.update({
            where: { id },
            data: { status },
        });

        // Send email notification to user asynchronously
        if (service.utilisateurs?.email && (status === 'active' || status === 'approved' || status === 'declined')) {
            const userName = `${service.utilisateurs.prenom} ${service.utilisateurs.nom}`;
            this.mailService.sendServiceStatusUpdateEmail(service.utilisateurs.email, userName, service.titre, status)
                .catch(err => this.logger.error(`Failed to send status email for service ${id}: ${err.message}`));
        }

        return updatedService;
    }
}
