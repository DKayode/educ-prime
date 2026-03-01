import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateAvisDto, UpdateAvisDto } from './dto/avis.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvisService {
    constructor(private prisma: PrismaService) { }

    async create(userId: number, createAvisDto: CreateAvisDto) {
        const service = await this.prisma.services.findUnique({
            where: { id: createAvisDto.service_id }
        });

        if (!service) {
            throw new NotFoundException("Service introuvable.");
        }

        // Un utilisateur ne peut pas noter son propre service
        if (service.utilisateur_id === userId) {
            throw new ForbiddenException("Vous ne pouvez pas noter votre propre service.");
        }

        // Vérifier si l'utilisateur a déjà laissé un avis pour ce service
        const existingAvis = await this.prisma.avis.findFirst({
            where: {
                service_id: createAvisDto.service_id,
                utilisateur_id: userId,
            }
        });

        if (existingAvis) {
            throw new ForbiddenException("Vous avez déjà laissé un avis pour ce service.");
        }

        // Optionnel: vérifier la communication entre les deux utilisateurs

        return this.prisma.avis.create({
            data: {
                note: createAvisDto.note,
                service_id: createAvisDto.service_id,
                utilisateur_id: userId,
            }
        });
    }

    async findAllByService(serviceId: number, pagination: { page: number, limit: number }) {
        const { page, limit } = pagination;

        // Obtenir tous les avis
        const total = await this.prisma.avis.count({ where: { service_id: serviceId } });
        const avisList = await this.prisma.avis.findMany({
            where: { service_id: serviceId },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                utilisateurs: {
                    select: { id: true, nom: true, prenom: true, photo: true }
                }
            },
            orderBy: { created_at: 'desc' },
        });

        // Pour chaque avis, on tente de récupérer le commentaire associé via la table polymorphique
        // Model attendu de commentaire: "Avis", ou l'entité commentée est l'ID de l'avis
        const enrichedAvis = await Promise.all(avisList.map(async (avis) => {
            const comment = await this.prisma.commentaireUser.findFirst({
                where: {
                    commentable_type: "Avis",
                    commentable_id: avis.id,
                    user_id: avis.utilisateur_id // le commentaire appartient au même auteur que l'avis
                }
            });

            return {
                ...avis,
                commentaire: comment ? comment.content : null,
                commentaire_id: comment ? comment.id : null,
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

        // 1. Mettre à jour la note dans la table avis si fournie
        if (updateAvisDto.note !== undefined) {
            await this.prisma.avis.update({
                where: { id },
                data: { note: updateAvisDto.note },
            });
        }

        // 2. Mettre à jour le commentaire dans la table polymorphic si fourni
        if (updateAvisDto.commentaire !== undefined) {
            // Cherche le commentaire existant
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
            }
            // Gérer le cas où le commentaire n'existe pas encore ? Pour l'instant on ignore.
        }

        return { message: "Avis mis à jour avec succès." };
    }

    async remove(id: number, userId: number) {
        const avis = await this.findOne(id);

        if (avis.utilisateur_id !== userId) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cet avis.");
        }

        // La suppression de l'avis pourrait entrainer la suppression du commentaire 
        // Si onDelete Cascade n'est pas géré au niveau polymorphique, il faut le supprimer manuellement
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
