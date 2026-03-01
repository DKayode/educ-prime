import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { services_status_enum } from '@prisma/client';

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
        private mailService: MailService
    ) { }

    private formatService(service: any) {
        if (!service) return service;
        const { type_id, service_type, ...rest } = service;
        return {
            ...rest,
            type: service_type
        };
    }

    async create(userId: number, createServiceDto: CreateServiceDto) {
        // Vérifier si l'email de l'utilisateur est vérifié
        const user = await this.prisma.utilisateurs.findUnique({
            where: { id: userId }
        });

        if (!user || !user.verifier) {
            throw new ForbiddenException("Vous devez vérifier votre adresse email pour poster un service.");
        }

        return this.prisma.services.create({
            data: {
                ...createServiceDto,
                utilisateur_id: userId,
            }
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
            whereClause.service_type = { slug: type };
        }

        if (tarifMin !== undefined || tarifMax !== undefined) {
            whereClause.tarif = {};
            if (tarifMin !== undefined) whereClause.tarif.gte = tarifMin;
            if (tarifMax !== undefined) whereClause.tarif.lte = tarifMax;
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
                    select: { id: true, nom: true, prenom: true }
                },
                service_type: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: data.map(s => this.formatService(s)),
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
                    select: { id: true, nom: true, prenom: true }
                },
                service_type: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            },
        });

        return {
            data: data.map(s => this.formatService(s)),
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
                    select: { id: true, nom: true, prenom: true, email: true }
                },
                service_type: {
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

        const { titre, description, tarif, localisation, type_id, disponibilite } = updateServiceDto;
        const dataToUpdate: any = { status: 'pending_approval' }; // Réinitialiser le statut

        if (titre !== undefined) dataToUpdate.titre = titre;
        if (description !== undefined) dataToUpdate.description = description;
        if (tarif !== undefined) dataToUpdate.tarif = tarif;
        if (localisation !== undefined) dataToUpdate.localisation = localisation;
        if (type_id !== undefined) dataToUpdate.type_id = type_id;
        if (disponibilite !== undefined) dataToUpdate.disponibilite = disponibilite;

        return this.prisma.services.update({
            where: { id },
            data: dataToUpdate,
        });
    }

    async remove(id: number, userId: number) {
        const service = await this.findOne(id);

        if (service.utilisateur_id !== userId) {
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
                    select: { id: true, nom: true, prenom: true }
                },
                service_type: {
                    select: { id: true, nom: true, slug: true, description: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: data.map(s => this.formatService(s)),
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
