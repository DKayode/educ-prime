import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOffreDto, UpdateOffreDto } from './dto/offre.dto';
import { services_status_enum } from '@prisma/client';

import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';
import { MailService } from '../mail/mail.service';

export interface OffreFilterDto {
    type?: string;
    prixMin?: number;
    prixMax?: number;
    search?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class OffresService {
    constructor(
        private prisma: PrismaService,
        private fichiersService: FichiersService,
        private mailService: MailService
    ) { }

    private readonly includeUtilisateur = {
        utilisateurs: {
            select: {
                id: true,
                uuid: true,
                nom: true,
                prenom: true,
                email: true,
                recruteur: true
            }
        }
    };

    private async formatOffre(offre: any) {
        if (!offre) return offre;
        const { type_id, types, utilisateurs, ...rest } = offre;

        const avisAgg = await this.prisma.avis.aggregate({
            where: { avisable_type: 'Offres', avisable_id: offre.id },
            _avg: { note: true },
            _count: { id: true }
        });

        let recruteur = null;
        if (utilisateurs?.recruteur) {
            const { utilisateur_id, ...recruteurRest } = utilisateurs.recruteur;
            recruteur = {
                ...recruteurRest,
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
            utilisateur_id: offre.utilisateur_id,
            type: types,
            recruteur,
            avis: {
                moyenne: avisAgg._avg.note ? parseFloat(Number(avisAgg._avg.note).toFixed(1)) : 0,
                total: avisAgg._count.id
            }
        };
    }

    private async formatManyOffres(offres: any[]) {
        if (!offres.length) return [];
        const offreIds = offres.map(o => o.id);
        const avisAgg = await this.prisma.avis.groupBy({
            by: ['avisable_id'],
            where: { avisable_type: 'Offres', avisable_id: { in: offreIds } },
            _avg: { note: true },
            _count: { id: true }
        });
        const avisMap = new Map(avisAgg.map(a => [a.avisable_id, {
            moyenne: a._avg.note ? parseFloat(Number(a._avg.note).toFixed(1)) : 0,
            total: a._count.id
        }]));

        return offres.map(offre => {
            const { type_id, types, utilisateurs, ...rest } = offre;
            let recruteur = null;
            if (utilisateurs?.recruteur) {
                const { utilisateur_id, ...recruteurRest } = utilisateurs.recruteur;
                recruteur = {
                    ...recruteurRest,
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
                utilisateur_id: offre.utilisateur_id,
                type: types,
                recruteur,
                avis: avisMap.get(offre.id) || { moyenne: 0, total: 0 }
            };
        });
    }

    async create(userId: number, createOffreDto: CreateOffreDto) {
        const user = await this.prisma.utilisateurs.findUnique({
            where: { id: userId }
        });

        if (!user || !user.verifier) {
            throw new ForbiddenException("Vous devez vérifier votre adresse email pour poster une offre.");
        }

        const recruteurProfile = await this.prisma.recruteurs.findUnique({
            where: { utilisateur_id: userId }
        });

        if (!recruteurProfile) {
            throw new ForbiddenException("Seuls les recruteurs peuvent publier des offres.");
        }

        let typeId = createOffreDto.type_id;

        if (!typeId) {
            if (createOffreDto.type) {
                const typeEntity = await this.prisma.types.findUnique({
                    where: { slug: createOffreDto.type },
                });
                if (!typeEntity) {
                    throw new NotFoundException(`Le type spécifié (${createOffreDto.type}) est introuvable.`);
                }
                typeId = typeEntity.id;
            } else {
                throw new BadRequestException('Vous devez spécifier soit "type_id" soit "type".');
            }
        }

        const { competences, type, type_id, ...offreData } = createOffreDto as any;

        // Verify if competences exist before connecting
        if (competences && competences.length > 0) {
            const existingCompetences = await this.prisma.competences.findMany({
                where: { slug: { in: competences } },
            });
            if (existingCompetences.length !== competences.length) {
                const existingSlugs = existingCompetences.map((c: any) => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
        }

        return this.prisma.offres.create({
            data: {
                ...offreData,
                type_id: typeId,
                utilisateur_id: userId,
                competences: competences ? {
                    connect: competences.map(slug => ({ slug }))
                } : undefined
            },
            include: {
                ...this.includeUtilisateur,
                competences: true,
                types: true
            }
        }).then(o => this.formatOffre(o));
    }

    async findAll(filters: OffreFilterDto) {
        const { type, prixMin, prixMax, search, page = 1, limit = 10 } = filters;

        const whereClause: any = {
            status: { in: ['approved', 'active'] }
        };

        if (type) {
            whereClause.types = { slug: type };
        }

        if (prixMin !== undefined || prixMax !== undefined) {
            whereClause.prix = {};
            if (prixMin !== undefined) whereClause.prix.gte = prixMin;
            if (prixMax !== undefined) whereClause.prix.lte = prixMax;
        }

        if (search) {
            whereClause.OR = [
                { titre: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const total = await this.prisma.offres.count({ where: whereClause });
        const data = await this.prisma.offres.findMany({
            where: whereClause,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                ...this.includeUtilisateur,
                types: {
                    select: { id: true, nom: true, slug: true, description: true }
                },
                competences: true
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: await this.formatManyOffres(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllByUser(userId: number, pagination: { page: number, limit: number }) {
        const { page = 1, limit = 10 } = pagination;

        const total = await this.prisma.offres.count({
            where: { utilisateur_id: userId }
        });

        const data = await this.prisma.offres.findMany({
            where: { utilisateur_id: userId },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                ...this.includeUtilisateur,
                types: true,
                competences: true
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: await this.formatManyOffres(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllAdmin(pagination: { page: number, limit: number }) {
        const { page = 1, limit = 10 } = pagination;

        const total = await this.prisma.offres.count();

        const data = await this.prisma.offres.findMany({
            skip: (page - 1) * limit,
            take: limit,
            include: {
                ...this.includeUtilisateur,
                types: true,
                competences: true
            },
            orderBy: { created_at: 'desc' },
        });

        return {
            data: await this.formatManyOffres(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const offre = await this.prisma.offres.findUnique({
            where: { id },
            include: {
                ...this.includeUtilisateur,
                types: {
                    select: { id: true, nom: true, slug: true, description: true }
                },
                competences: true
            }
        });

        if (!offre) {
            throw new NotFoundException(`Offre #${id} introuvable`);
        }

        return this.formatOffre(offre);
    }

    async update(id: number, userId: number, updateOffreDto: UpdateOffreDto) {
        const offre = await this.prisma.offres.findUnique({
            where: { id }
        });

        if (!offre) {
            throw new NotFoundException(`Offre #${id} introuvable`);
        }

        if (offre.utilisateur_id !== Number(userId)) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette offre.");
        }

        let typeId = updateOffreDto.type_id;

        if (!typeId && updateOffreDto.type) {
            const typeEntity = await this.prisma.types.findUnique({
                where: { slug: updateOffreDto.type },
            });
            if (!typeEntity) {
                throw new NotFoundException(`Le type spécifié (${updateOffreDto.type}) est introuvable.`);
            }
            typeId = typeEntity.id;
        }

        const { competences, type, type_id, ...offreData } = updateOffreDto as any;

        // Remove status explicitly just in case validation pipes fail to strip it
        if ('status' in offreData) {
            delete offreData.status;
        }

        const updateData: any = { ...offreData };
        if (typeId) {
            updateData.type_id = typeId;
        }

        // Verify if competences exist before setting
        if (competences && competences.length > 0) {
            const existingCompetences = await this.prisma.competences.findMany({
                where: { slug: { in: competences } },
            });
            if (existingCompetences.length !== competences.length) {
                const existingSlugs = existingCompetences.map((c: any) => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
        }

        return this.prisma.offres.update({
            where: { id },
            data: {
                ...updateData,
                competences: competences ? {
                    set: competences.map(slug => ({ slug }))
                } : undefined
            },
            include: {
                ...this.includeUtilisateur,
                competences: true,
                types: true
            }
        }).then(o => this.formatOffre(o));
    }

    async updateStatus(id: number, status: services_status_enum) {
        const existingOffre = await this.findOne(id); // Ensure it exists

        const updated = await this.prisma.offres.update({
            where: { id },
            data: { status },
            include: {
                ...this.includeUtilisateur,
                competences: true,
                types: true
            }
        });

        // Send email notification if status changed
        if (existingOffre.status !== status && updated.utilisateurs?.email) {
            const userName = updated.utilisateurs.prenom || updated.utilisateurs.nom || 'Utilisateur';
            const serviceTitle = updated.titre || 'Offre';

            // We use setTimeout to not block the request while the email sends
            setTimeout(async () => {
                try {
                    await this.mailService.sendServiceStatusUpdateEmail(
                        updated.utilisateurs.email,
                        userName,
                        serviceTitle,
                        status,
                        'offre'
                    );
                } catch (error) {
                    console.error("Failed to send offer status update email asynchronously", error);
                }
            }, 0);
        }

        return this.formatOffre(updated);
    }

    async remove(id: number, userId: number) {
        const offre = await this.prisma.offres.findUnique({
            where: { id }
        });

        if (!offre) {
            throw new NotFoundException(`Offre #${id} introuvable`);
        }

        if (offre.utilisateur_id !== Number(userId)) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette offre.");
        }

        await this.prisma.offres.delete({
            where: { id }
        });

        return { message: "Offre supprimée avec succès." };
    }

    async uploadImageCouverture(offreId: number, userId: number, file: Express.Multer.File) {
        const offre = await this.findOne(offreId);

        if (offre.utilisateur_id !== Number(userId)) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier l'image de cette offre.");
        }

        const uploadData = {
            type: TypeFichier.OFFRE,
            entityId: offreId,
        };

        const result = await this.fichiersService.uploadFile(file, userId, uploadData as any);

        await this.prisma.offres.update({
            where: { id: offreId },
            data: { image_couverture: result.url }
        });

        return { message: 'Image de couverture mise à jour avec succès', url: result.url };
    }

    async downloadImageCouverture(offreId: number) {
        const offre = await this.findOne(offreId);

        if (!offre.image_couverture) {
            throw new NotFoundException('Image de couverture non trouvée pour cette offre');
        }

        return this.fichiersService.downloadFile(offre.image_couverture);
    }
}
