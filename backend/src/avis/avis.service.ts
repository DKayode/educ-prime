import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAvisDto, UpdateAvisDto } from './dto/avis.dto';
import { PrismaService } from '../prisma/prisma.service';
import { entite_type_enum } from '@prisma/client';

@Injectable()
export class AvisService {
    constructor(private prisma: PrismaService) { }

    async create(userId: number, createAvisDto: CreateAvisDto) {
        const { avisable_id, avisable_type, note } = createAvisDto;

        // Valider que l'entité cible existe
        let targetEntity: any;
        if (avisable_type === entite_type_enum.Services) {
            targetEntity = await this.prisma.services.findUnique({
                where: { id: avisable_id }
            });
        } else if (avisable_type === entite_type_enum.Offres) {
            targetEntity = await this.prisma.offres.findUnique({
                where: { id: avisable_id }
            });
        }

        if (!targetEntity) {
            throw new NotFoundException(`${avisable_type} introuvable.`);
        }

        // Empêcher de noter sa propre entité
        if (targetEntity.utilisateur_id === userId) {
            throw new ForbiddenException(`Vous ne pouvez pas noter votre propre ${avisable_type.toLowerCase()}.`);
        }

        // Vérifier si un avis existe déjà
        const existingAvis = await this.prisma.avis.findFirst({
            where: {
                avisable_id,
                avisable_type,
                utilisateur_id: userId,
            }
        });

        if (existingAvis) {
            throw new ForbiddenException(`Vous avez déjà laissé un avis pour ce ${avisable_type.toLowerCase()}.`);
        }

        return this.prisma.avis.create({
            data: {
                note,
                avisable_id,
                avisable_type,
                utilisateur_id: userId,
            }
        });
    }

    async findAllByModel(model: string, id: number, pagination: { page: number, limit: number }) {
        let entityType: entite_type_enum;
        if (model.toLowerCase() === 'services') {
            entityType = entite_type_enum.Services;
        } else if (model.toLowerCase() === 'offres') {
            entityType = entite_type_enum.Offres;
        } else {
            throw new BadRequestException('Modèle invalide. Utilisez "Services" ou "Offres".');
        }
        return this.findAllByEntity(id, entityType, pagination);
    }

    private async findAllByEntity(entityId: number, entityType: entite_type_enum, pagination: { page: number, limit: number }) {
        const { page, limit } = pagination;

        const total = await this.prisma.avis.count({
            where: {
                avisable_id: entityId,
                avisable_type: entityType
            }
        });

        const avisList = await this.prisma.avis.findMany({
            where: {
                avisable_id: entityId,
                avisable_type: entityType
            },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                utilisateurs: {
                    select: { id: true, uuid: true, nom: true, prenom: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        const enrichedAvis = await Promise.all(avisList.map(async (avis) => {
            const comment = await this.prisma.commentaireUser.findFirst({
                where: {
                    commentable_type: "Avis",
                    commentable_id: avis.id,
                    user_id: avis.utilisateur_id
                }
            });

            const { utilisateur_id, utilisateurs, ...restAvis } = avis;

            return {
                ...restAvis,
                utilisateur: utilisateurs ? {
                    id: utilisateurs.id,
                    ui: utilisateurs.uuid,
                    nom: utilisateurs.nom,
                    prenom: utilisateurs.prenom,
                    email: utilisateurs.email,
                } : null,
                commentaire: comment ? comment.content : null,
            };
        }));

        return {
            data: enrichedAvis,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const avis = await this.prisma.avis.findUnique({
            where: { id },
        });

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

        if (updateAvisDto.note !== undefined) {
            await this.prisma.avis.update({
                where: { id },
                data: { note: updateAvisDto.note },
            });
        }

        if (updateAvisDto.commentaire !== undefined) {
            const existingComment = await this.prisma.commentaireUser.findFirst({
                where: {
                    commentable_type: "Avis",
                    commentable_id: avis.id,
                    user_id: userId
                }
            });

            if (existingComment) {
                await this.prisma.commentaireUser.update({
                    where: { id: existingComment.id },
                    data: { content: updateAvisDto.commentaire },
                });
            } else {
                // Créer le commentaire s'il n'existe pas (si le DTO le permet lors de l'update)
                // Note: La logique initiale semblait l'ignorer, je garde la cohérence mais c'est une amélioration possible.
            }
        }

        return { message: "Avis mis à jour avec succès." };
    }

    async remove(id: number, userId: number) {
        const avis = await this.findOne(id);

        if (avis.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cet avis.");
        }

        await this.prisma.commentaireUser.deleteMany({
            where: {
                commentable_type: "Avis",
                commentable_id: id
            }
        });

        await this.prisma.avis.delete({
            where: { id }
        });

        return { message: "Avis supprimé avec succès." };
    }
}
