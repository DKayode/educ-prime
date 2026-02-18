import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LikesPolymorphicService } from '../likes-polymorphic/likes-polymorphic.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { CreateCommentPolymorphicDto } from './dto/create-comment-polymorphic.dto';

@Injectable()
export class CommentsPolymorphicService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly likesService: LikesPolymorphicService,
    ) { }

    private validateModel(model: string) {
        const validModels = ['Forums', 'Parcours', 'Commentaires'];
        if (!validModels.includes(model)) {
            throw new BadRequestException(`Invalid model: ${model}. Valid models are: ${validModels.join(', ')}`);
        }
    }

    async create(model: string, id: number, createDto: CreateCommentPolymorphicDto, userId: number) {
        this.validateModel(model);

        let parentId = createDto.commentaire_id ? createDto.commentaire_id : null;

        // If we represent a reply to a comment (model === 'Commentaires'), 
        // the ID in the path is the parent comment ID.
        if (model === 'Commentaires') {
            parentId = id;
        }

        const commentData = {
            commentable_id: BigInt(id),
            commentable_type: model,
            content: createDto.content,
            user_id: userId,
            commentaire_id: parentId
        };

        const result = await this.prisma.commentaireUser.create({
            data: commentData,
            include: {
                user: {
                    select: {
                        id: true,
                        nom: true,
                        prenom: true,
                        pseudo: true,
                        email: true,
                        sexe: true,
                    }
                }
            }
        });

        return this.mapResponse(result);
    }

    async findAllByEntity(model: string, id: number, paginationDto: PaginationDto = {}, userId?: number): Promise<PaginationResponse<any>> {
        this.validateModel(model);
        const { page = 1, limit = 10 } = paginationDto;
        const skip = (page - 1) * limit;
        const take = limit;

        const [comments, total] = await Promise.all([
            this.prisma.commentaireUser.findMany({
                where: {
                    commentable_type: model,
                    commentable_id: BigInt(id),
                    commentaire_id: null, // Get roots
                    deleted_at: null
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nom: true,
                            prenom: true,
                            pseudo: true,
                            email: true,
                            sexe: true,
                        }
                    },
                    children: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    nom: true,
                                    prenom: true,
                                    pseudo: true,
                                    email: true,
                                    sexe: true,
                                }
                            },
                            children: { // Level 2
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            nom: true,
                                            prenom: true,
                                            pseudo: true,
                                            email: true,
                                            sexe: true,
                                        }
                                    },
                                    children: { // Level 3
                                        include: {
                                            user: {
                                                select: {
                                                    id: true,
                                                    nom: true,
                                                    prenom: true,
                                                    pseudo: true,
                                                    email: true,
                                                    sexe: true,
                                                }
                                            },
                                            children: { // Level 4
                                                include: {
                                                    user: {
                                                        select: {
                                                            id: true,
                                                            nom: true,
                                                            prenom: true,
                                                            pseudo: true,
                                                            email: true,
                                                            sexe: true,
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take,
            }),
            this.prisma.commentaireUser.count({
                where: {
                    commentable_type: model,
                    commentable_id: BigInt(id),
                    commentaire_id: null,
                    deleted_at: null
                }
            })
        ]);

        let likedSet = new Set<number>();
        if (userId) {
            // Flatten comments to get all IDs
            const allCommentIds: number[] = [];
            const collectIds = (nodes: any[]) => {
                for (const node of nodes) {
                    allCommentIds.push(node.id);
                    if (node.children && node.children.length > 0) {
                        collectIds(node.children);
                    }
                }
            };
            collectIds(comments);

            if (allCommentIds.length > 0) {
                const likedIds = await this.likesService.getLikedIdsByUser('Commentaires', allCommentIds, userId);
                likedSet = new Set(likedIds);
            }
        }

        return {
            data: comments.map((comment) => this.mapResponse(comment, likedSet)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async remove(model: string, id: number) {
        this.validateModel(model);

        // Recursive delete: Find children of THIS comment
        const children = await this.prisma.commentaireUser.findMany({
            where: {
                commentable_type: 'Commentaires',
                commentable_id: BigInt(id),
                deleted_at: null
            }
        });

        for (const child of children) {
            await this.remove('Commentaires', child.id);
        }

        // Now delete the comment itself
        const result = await this.prisma.commentaireUser.delete({
            where: { id },
        });

        return this.mapResponse(result);
    }

    async countComments(model: string, id: number) {
        this.validateModel(model);
        const count = await this.prisma.commentaireUser.count({
            where: {
                commentable_type: model,
                commentable_id: BigInt(id),
                deleted_at: null
            }
        });
        return { totalCommentaires: count };
    }

    private mapResponse(comment: any, likedSet: Set<number> = new Set()) {
        return {
            ...comment,
            commentable_id: comment.commentable_id.toString(), // Handle BigInt
            isLiked: likedSet.has(comment.id),
            children: comment.children ? comment.children.map(c => this.mapResponse(c, likedSet)) : []
        };
    }
}
