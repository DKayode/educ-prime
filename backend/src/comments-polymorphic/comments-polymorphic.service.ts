import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { LikesPolymorphicService } from '../likes-polymorphic/likes-polymorphic.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { CreateCommentPolymorphicDto } from './dto/create-comment-polymorphic.dto';
import { UpdateCommentPolymorphicDto } from './dto/update-comment-polymorphic.dto';
import { CommentaireUser } from './entities/commentaire-user.entity';
import { Forum } from '../forum/entities/forum.entity';
import { Avis } from '../avis/entities/avis.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';

const VALID_MODELS = ['Forums', 'Parcours', 'Commentaires', 'Avis'];
const USER_FIELDS = ['id', 'nom', 'prenom', 'pseudo', 'email', 'sexe'] as const;

const userSelect = USER_FIELDS.reduce((acc, f) => ({ ...acc, [f]: true }), {} as Record<string, true>);

@Injectable()
export class CommentsPolymorphicService {
    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly likesService: LikesPolymorphicService,
    ) { }

    private get commentsRepository(): Repository<CommentaireUser> {
        return this.resolver.getRepository(CommentaireUser);
    }

    private validateModel(model: string) {
        if (!VALID_MODELS.includes(model)) {
            throw new BadRequestException(
                `Invalid model: ${model}. Valid models are: ${VALID_MODELS.join(', ')}`,
            );
        }
    }

    private async checkEntityExists(model: string, id: number) {
        let entity: unknown;
        switch (model) {
            case 'Forums':
                entity = await this.resolver.getRepository(Forum).findOne({ where: { id } });
                break;
            case 'Commentaires':
                entity = await this.commentsRepository.findOne({ where: { id } });
                break;
            case 'Avis':
                entity = await this.resolver.getRepository(Avis).findOne({ where: { id } });
                break;
            default:
                return; // Parcours not validated here for now
        }

        if (!entity) {
            throw new NotFoundException(`${model} with ID ${id} not found`);
        }
    }

    async create(pays: string, model: string, id: number, createDto: CreateCommentPolymorphicDto, userId: number) {
        this.validateModel(model);
        await this.checkEntityExists(model, id);

        let parentId: number | null = createDto.commentaire_id ?? null;
        if (model === 'Commentaires') {
            parentId = id;
        }

        const comment = this.commentsRepository.create({
            pays,
            commentable_id: String(id),
            commentable_type: model,
            content: createDto.content,
            user_id: userId,
            commentaire_id: parentId,
        });
        const saved = await this.commentsRepository.save(comment);

        const full = await this.commentsRepository.findOne({
            where: { id: saved.id },
            relations: ['user'],
        });
        return this.mapResponse(full);
    }

    async update(id: number, updateCommentDto: UpdateCommentPolymorphicDto, userId: number) {
        const comment = await this.commentsRepository.findOne({ where: { id } });
        if (!comment) {
            throw new NotFoundException(`Comment with ID ${id} not found`);
        }
        if (comment.user_id !== userId) {
            throw new ForbiddenException('You are not authorized to update this comment');
        }

        comment.content = updateCommentDto.content;
        const saved = await this.commentsRepository.save(comment);
        return this.mapResponse(saved);
    }

    async findAllByEntity(
        pays: string,
        model: string,
        id: number,
        paginationDto: PaginationDto = {},
        userId?: number,
    ): Promise<PaginationResponse<any>> {
        this.validateModel(model);
        const { page = 1, limit = 10 } = paginationDto;

        // Load four levels of children — matches the previous Prisma include depth.
        const childrenRelations = {
            user: true,
            children: {
                user: true,
                children: {
                    user: true,
                    children: {
                        user: true,
                        children: { user: true },
                    },
                },
            },
        };

        const [comments, total] = await this.commentsRepository.findAndCount({
            where: {
                pays,
                commentable_type: model,
                commentable_id: String(id),
                commentaire_id: IsNull(),
                deleted_at: IsNull(),
            },
            relations: { user: true, ...childrenRelations },
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const allCommentIds: number[] = [];
        const collectIds = (nodes: any[]) => {
            for (const node of nodes) {
                allCommentIds.push(node.id);
                if (node.children?.length) collectIds(node.children);
            }
        };
        collectIds(comments);

        let likedSet = new Set<number>();
        let likesCounts = new Map<number, number>();
        if (allCommentIds.length > 0) {
            if (userId) {
                const likedIds = await this.likesService.getLikedIdsByUser('Commentaires', allCommentIds, userId);
                likedSet = new Set(likedIds);
            }
            likesCounts = await this.likesService.getLikesCounts('Commentaires', allCommentIds);
        }

        return {
            data: comments.map(comment => this.mapResponse(comment, likedSet, likesCounts)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async remove(model: string, id: number) {
        this.validateModel(model);

        const children = await this.commentsRepository.find({
            where: {
                commentable_type: 'Commentaires',
                commentable_id: String(id),
                deleted_at: IsNull(),
            },
        });
        for (const child of children) {
            await this.remove('Commentaires', child.id);
        }

        const comment = await this.commentsRepository.findOne({ where: { id } });
        if (!comment) {
            throw new NotFoundException(`Comment with ID ${id} not found`);
        }
        await this.commentsRepository.remove(comment);
        return this.mapResponse(comment);
    }

    async countComments(model: string, id: number) {
        this.validateModel(model);
        const count = await this.commentsRepository.count({
            where: {
                commentable_type: model,
                commentable_id: String(id),
                deleted_at: IsNull(),
            },
        });
        return { totalCommentaires: count };
    }

    private formatToParisTime(date: Date): string {
        return new Intl.DateTimeFormat('fr-FR', {
            timeZone: 'Europe/Paris',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(date);
    }

    private narrowUser(user: any) {
        if (!user) return null;
        return USER_FIELDS.reduce((acc, f) => ({ ...acc, [f]: user[f] }), {} as Record<string, any>);
    }

    private mapResponse(
        comment: any,
        likedSet: Set<number> = new Set(),
        likesCounts: Map<number, number> = new Map(),
    ): any {
        if (!comment) return null;
        return {
            ...comment,
            user: this.narrowUser(comment.user),
            created_at: comment.created_at ? this.formatToParisTime(comment.created_at) : null,
            updated_at: comment.updated_at ? this.formatToParisTime(comment.updated_at) : null,
            commentable_id: comment.commentable_id ? comment.commentable_id.toString() : null,
            commentaire_id: comment.commentaire_id != null ? comment.commentaire_id.toString() : null,
            isLiked: likedSet.has(comment.id),
            nb_like: likesCounts.get(comment.id) || 0,
            nb_comment: comment.children ? comment.children.length : 0,
            children: comment.children
                ? comment.children.map((c: any) => this.mapResponse(c, likedSet, likesCounts))
                : [],
        };
    }
}
