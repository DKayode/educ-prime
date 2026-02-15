import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LikesPolymorphicService } from '../likes-polymorphic/likes-polymorphic.service';
import { CreateForumDto } from './dto/create-forum.dto';
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

    async findAll(filterDto: FilterForumDto): Promise<PaginationResponse<any>> {
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
                nb_comment,
                nb_like,
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

    async findOne(id: number) {
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

        const { user_id, ...forumWithoutUserId } = forum;

        return {
            ...forumWithoutUserId,
            nb_like,
            nb_comment,
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
        // detailed logic: "follow logic implemented in DELETE /commentaires/:model/:id"
        // This means we should call commentsService.remove() for each root comment to trigger recursion.

        // We need to inject CommentsPolymorphicService or use Prisma directly if we replicate logic.
        // Since we need to follow the logic, calling the service is safer but requires injection.
        // Let's check imports. We don't have CommentsService injected yet.
        // For now, I will implement the loop here using Prisma to find roots, then recursing?
        // Actually, simpler: find ALL comments for this forum (roots), then call a recursive delete function?
        // Or if we can inject CommentsPolymorphicService that would be best. 
        // But circular dependency risk if CommentsService imports ForumService.
        // Let's assume for now we can select them and delete them.
        // But the user said "following logic implemented in ...". 
        // The logic there is: find children -> remove children -> remove self.

        // Let's fetch root comments for this forum
        const rootComments = await this.prisma.commentaireUser.findMany({
            where: {
                commentable_type: 'Forums',
                commentable_id: BigInt(id),
                deleted_at: null
            }
        });

        // We can't easily call CommentsPolymorphicService.remove without injecting it.
        // And we can't inject it if it's not in the module.
        // Let's assume we implement a private helper or local recursion if needed.
        // BUT, wait, `CommentsPolymorphicService` is NOT injected. 
        // I will add a private recursion helper `deleteCommentRecursively` here to duplicate the logic safely 
        // without circular deps, OR I will modify the constructor to inject it if possible.
        // Given the constraints and likely circular dep (Comments might use ForumService later),
        // I'll replicate the recursive logic here which is cleaner for now.

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
