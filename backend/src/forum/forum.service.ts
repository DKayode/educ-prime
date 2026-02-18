import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LikesPolymorphicService } from '../likes-polymorphic/likes-polymorphic.service';
import { CreateForumDto } from './dto/create-forum.dto';
import { UpdateForumDto } from './dto/update-forum.dto';
import { FilterForumDto } from './dto/filter-forum.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

import { FichiersService } from '../fichiers/fichiers.service';

@Injectable()
export class ForumService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly likesService: LikesPolymorphicService,
        private readonly fichiersService: FichiersService,
    ) { }

    async create(createForumDto: CreateForumDto, userId: number) {
        return this.prisma.forum.create({
            data: {
                ...createForumDto,
                user_id: userId,
            },
        });
    }

    async update(id: number, updateForumDto: UpdateForumDto, userId: number) {
        const forum = await this.prisma.forum.findUnique({ where: { id } });
        if (!forum) {
            throw new NotFoundException(`Forum with ID ${id} not found`);
        }

        if (forum.user_id !== userId) {
            throw new ForbiddenException(`You are not authorized to update this forum`);
        }

        return this.prisma.forum.update({
            where: { id },
            data: updateForumDto,
        });
    }

    private formatToParisTime(date: Date): string {
        return new Intl.DateTimeFormat('fr-FR', {
            timeZone: 'Europe/Paris',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }

    async findAll(filterDto: FilterForumDto, userId: number): Promise<PaginationResponse<any>> {
        const { page = 1, limit = 10, search, sortBy = 'most_liked' } = filterDto;
        const skip = (page - 1) * limit;
        const take = limit;

        const where = search
            ? {
                theme: {
                    contains: search,
                    mode: 'insensitive' as const,
                },
                deleted_at: null,
            }
            : { deleted_at: null };

        const [forums, total] = await Promise.all([
            this.prisma.forum.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            nom: true,
                            prenom: true,
                            pseudo: true,
                            email: true,
                            sexe: true,
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
                skip,
                take,
            }),
            this.prisma.forum.count({ where }),
        ]);

        // Get list of forum IDs to check likes efficiently
        const forumIds = forums.map(f => f.id);
        const likedForumIds = await this.likesService.getLikedIdsByUser('Forums', forumIds, userId);
        const likedSet = new Set(likedForumIds);

        // Map likes and comments count
        const forumsWithCounts = await Promise.all(forums.map(async (forum) => {
            const nb_like = await this.likesService.countLikes('Forums', forum.id);

            const nb_comment = await this.prisma.commentaireUser.count({
                where: {
                    commentable_type: 'Forums',
                    commentable_id: BigInt(forum.id),
                    deleted_at: null
                }
            });

            const { user_id, ...forumWithoutUserId } = forum;

            return {
                ...forumWithoutUserId,
                created_at: this.formatToParisTime(forum.created_at),
                updated_at: this.formatToParisTime(forum.updated_at),
                nb_comment,
                nb_like,
                isLiked: likedSet.has(forum.id)
            };
        }));

        if (sortBy === 'most_liked') {
            forumsWithCounts.sort((a, b) => b.nb_like - a.nb_like);
        } else if (sortBy === 'most_commented') {
            forumsWithCounts.sort((a, b) => (b.nb_comment || 0) - (a.nb_comment || 0));
        }

        return {
            data: forumsWithCounts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number, userId: number) {
        const forum = await this.prisma.forum.findFirst({
            where: { id, deleted_at: null },
            include: {
                user: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        pseudo: true,
                        email: true,
                        sexe: true,
                    },
                },
            },
        });

        if (!forum) return null;

        const nb_like = await this.likesService.countLikes('Forums', forum.id);
        const nb_comment = await this.prisma.commentaireUser.count({
            where: {
                commentable_type: 'Forums',
                commentable_id: BigInt(forum.id),
                deleted_at: null
            }
        });

        const isLiked = await this.likesService.isLiked('Forums', forum.id, userId);

        const { user_id, ...forumWithoutUserId } = forum;

        return {
            ...forumWithoutUserId,
            created_at: this.formatToParisTime(forum.created_at),
            updated_at: this.formatToParisTime(forum.updated_at),
            nb_like,
            nb_comment,
            isLiked
        };
    }

    async remove(id: number) {
        // 1. Remove all likes associated to the forum
        await this.prisma.likeUser.deleteMany({
            where: {
                likeable_type: 'Forums',
                likeable_id: BigInt(id)
            }
        });

        // 2. Remove all comments associated to the forum
        const rootComments = await this.prisma.commentaireUser.findMany({
            where: {
                commentable_type: 'Forums',
                commentable_id: BigInt(id),
                deleted_at: null
            }
        });

        for (const comment of rootComments) {
            await this.deleteCommentRecursively(comment.id);
        }

        // 3. Remove the Forum itself
        return this.prisma.forum.delete({
            where: { id },
        });
    }

    private async deleteCommentRecursively(commentId: number) {
        // Find children (replies)
        const children = await this.prisma.commentaireUser.findMany({
            where: {
                commentable_type: 'Commentaires',
                commentable_id: BigInt(commentId),
                deleted_at: null
            }
        });

        for (const child of children) {
            await this.deleteCommentRecursively(child.id);
        }

        // Delete self
        await this.prisma.commentaireUser.delete({
            where: { id: commentId }
        });
    }

    async uploadPhoto(id: number, file: Express.Multer.File, userId: number) {
        // Check if forum exists
        const forum = await this.prisma.forum.findUnique({ where: { id } });
        if (!forum) {
            throw new Error(`Forum with ID ${id} not found`);
        }

        // Prepare upload data
        // We reuse FichierUploadData interface structure roughly
        const uploadData = {
            type: 'FORUMS', // TypeFichier.FORUMS
            entityId: id,
        } as any;

        // Call FichiersService
        const result = await this.fichiersService.uploadFile(file, userId, uploadData);

        // Update Forum with photo URL
        await this.prisma.forum.update({
            where: { id },
            data: { photo: result.url }
        });

        return result;
    }

    async getPhoto(id: number) {
        const forum = await this.prisma.forum.findUnique({ where: { id } });
        if (!forum) {
            throw new Error(`Forum with ID ${id} not found`);
        }
        if (!forum.photo) {
            throw new Error(`No photo found for Forum ${id}`);
        }

        return this.fichiersService.downloadFile(forum.photo);
    }
}
