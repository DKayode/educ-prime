import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository, IsNull, ILike, Not, In } from 'typeorm';
import { LikesPolymorphicService } from '../likes-polymorphic/likes-polymorphic.service';
import { CreateForumDto } from './dto/create-forum.dto';
import { UpdateForumDto } from './dto/update-forum.dto';
import { FilterForumDto } from './dto/filter-forum.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

import { FichiersService } from '../fichiers/fichiers.service';
import { Forum } from './entities/forum.entity';
import { CommentaireUser } from '../comments-polymorphic/entities/commentaire-user.entity';
import { LikeUser } from '../likes-polymorphic/entities/like-user.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import {
    TypeProfilVisibilityService,
    TypeProfilJoinConfig,
    ViewerContext,
} from '../type-profils/type-profil-visibility.service';

@Injectable()
export class ForumService {
    private readonly typeProfilJoin: TypeProfilJoinConfig = {
        entity: 'forum',
        joinTable: 'forum_type_profils',
        fkColumn: 'forum_id',
    };

    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly likesService: LikesPolymorphicService,
        private readonly fichiersService: FichiersService,
        private readonly typeProfilVisibility: TypeProfilVisibilityService,
    ) { }

    private get forumRepository(): Repository<Forum> { return this.resolver.getRepository(Forum); }

    /** Lit la checklist de types de profil taguée sur un forum. */
    async getTypeProfilIds(id: number): Promise<{ typeProfilIds: number[] }> {
        const forum = await this.forumRepository.findOne({ where: { id } });
        if (!forum) throw new NotFoundException(`Forum with ID ${id} not found`);
        const typeProfilIds = await this.typeProfilVisibility.getTypeProfilIds(this.typeProfilJoin, id);
        return { typeProfilIds };
    }

    /** Remplace (replace-set) la checklist de types de profil d'un forum. */
    async setTypeProfilIds(id: number, typeProfilIds: number[]): Promise<{ typeProfilIds: number[] }> {
        const forum = await this.forumRepository.findOne({ where: { id } });
        if (!forum) throw new NotFoundException(`Forum with ID ${id} not found`);
        const saved = await this.typeProfilVisibility.setTypeProfilIds(this.typeProfilJoin, id, typeProfilIds);
        return { typeProfilIds: saved };
    }
    private get commentsRepository(): Repository<CommentaireUser> { return this.resolver.getRepository(CommentaireUser); }
    private get likesRepository(): Repository<LikeUser> { return this.resolver.getRepository(LikeUser); }

    async create(pays: string, createForumDto: CreateForumDto, userId: number) {
        const forum = this.forumRepository.create({
            ...createForumDto,
            pays,
            user_id: userId,
        });
        return this.forumRepository.save(forum);
    }

    async update(id: number, updateForumDto: UpdateForumDto, userId: number) {
        const forum = await this.forumRepository.findOne({ where: { id } });
        if (!forum) {
            throw new NotFoundException(`Forum with ID ${id} not found`);
        }

        if (forum.user_id !== userId) {
            throw new ForbiddenException(`You are not authorized to update this forum`);
        }

        Object.assign(forum, updateForumDto);
        return this.forumRepository.save(forum);
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

    async findAll(pays: string, filterDto: FilterForumDto, userId: number, viewer?: ViewerContext): Promise<PaginationResponse<any>> {
        const { page = 1, limit = 10, search, sortBy = 'date_creation', sort_order = 'DESC' } = filterDto;
        const skip = (page - 1) * limit;
        const take = limit;

        const where: any = { pays, deleted_at: IsNull() };
        if (search) {
            where.theme = ILike(`%${search}%`);
        }

        // Visibilité par type de profil (chemin findAndCount) : registre entité-niveau.
        // Si l'entité forum est masquée pour l'appelant → aucune ligne.
        if (await this.typeProfilVisibility.isEntityHidden(this.typeProfilJoin, viewer)) {
            where.id = -1;
        }

        const [forums, total] = await this.forumRepository.findAndCount({
            where,
            relations: ['user'],
            order: {
                created_at: sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
            },
            skip,
            take,
        });

        // Get list of forum IDs to check likes efficiently
        const forumIds = forums.map(f => f.id);
        const likedForumIds = await this.likesService.getLikedIdsByUser('Forums', forumIds, userId);
        const likedSet = new Set(likedForumIds);

        // Map likes and comments count
        const forumsWithCounts = await Promise.all(forums.map(async (forum) => {
            const nb_like = await this.likesService.countLikes('Forums', forum.id);

            const nb_comment = await this.commentsRepository.count({
                where: {
                    commentable_type: 'Forums',
                    commentable_id: String(forum.id),
                    deleted_at: IsNull(),
                },
            });

            const { user_id, user, ...forumWithoutUserId } = forum;
            const safeUser = user ? {
                id: user.id,
                uuid: user.uuid,
                nom: user.nom,
                prenom: user.prenom,
                pseudo: user.pseudo,
                email: user.email,
                sexe: user.sexe,
                profil: user.profil_photo_path || null,
            } : null;

            return {
                ...forumWithoutUserId,
                user: safeUser,
                created_at: this.formatToParisTime(forum.created_at),
                updated_at: this.formatToParisTime(forum.updated_at),
                nb_comment,
                nb_like,
                isLiked: likedSet.has(forum.id)
            };
        }));

        if (sortBy === 'most_liked') {
            forumsWithCounts.sort((a, b) => sort_order === 'ASC' ? a.nb_like - b.nb_like : b.nb_like - a.nb_like);
        } else if (sortBy === 'most_commented') {
            forumsWithCounts.sort((a, b) => sort_order === 'ASC' ? (a.nb_comment || 0) - (b.nb_comment || 0) : (b.nb_comment || 0) - (a.nb_comment || 0));
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
        const forum = await this.forumRepository.findOne({
            where: { id, deleted_at: IsNull() },
            relations: ['user'],
        });

        if (!forum) return null;

        const nb_like = await this.likesService.countLikes('Forums', forum.id);
        const nb_comment = await this.commentsRepository.count({
            where: {
                commentable_type: 'Forums',
                commentable_id: String(forum.id),
                deleted_at: IsNull(),
            },
        });

        const isLiked = await this.likesService.isLiked('Forums', forum.id, userId);

        const { user_id, user, ...forumWithoutUserId } = forum;
        const safeUser = user ? {
            id: user.id,
            uuid: user.uuid,
            nom: user.nom,
            prenom: user.prenom,
            pseudo: user.pseudo,
            email: user.email,
            sexe: user.sexe,
            profil: user.profil_photo_path || null,
        } : null;

        return {
            ...forumWithoutUserId,
            user: safeUser,
            created_at: this.formatToParisTime(forum.created_at),
            updated_at: this.formatToParisTime(forum.updated_at),
            nb_like,
            nb_comment,
            isLiked
        };
    }

    async remove(id: number) {
        // 1. Remove all likes associated to the forum
        await this.likesRepository.delete({
            likeable_type: 'Forums',
            likeable_id: String(id),
        });

        // 2. Remove all comments associated to the forum
        const rootComments = await this.commentsRepository.find({
            where: {
                commentable_type: 'Forums',
                commentable_id: String(id),
                deleted_at: IsNull(),
            },
        });

        for (const comment of rootComments) {
            await this.deleteCommentRecursively(comment.id);
        }

        // 3. Soft Remove the Forum itself
        await this.forumRepository.softDelete(id);
        return { message: "Forum deleted successfully" };
    }

    private async deleteCommentRecursively(commentId: number) {
        const children = await this.commentsRepository.find({
            where: {
                commentable_type: 'Commentaires',
                commentable_id: String(commentId),
                deleted_at: IsNull(),
            },
        });

        for (const child of children) {
            await this.deleteCommentRecursively(child.id);
        }

        const self = await this.commentsRepository.findOne({ where: { id: commentId } });
        if (self) {
            await this.commentsRepository.remove(self);
        }
    }

    async uploadPhoto(id: number, file: Express.Multer.File, userId: number) {
        // Check if forum exists
        const forum = await this.forumRepository.findOne({ where: { id } });
        if (!forum) {
            throw new Error(`Forum with ID ${id} not found`);
        }

        const uploadData = {
            type: 'FORUMS',
            entityId: id,
        } as any;

        const result = await this.fichiersService.uploadFile(file, userId, uploadData);

        forum.photo = result.url;
        await this.forumRepository.save(forum);

        return result;
    }

    async getPhoto(id: number) {
        const forum = await this.forumRepository.findOne({ where: { id } });
        if (!forum) {
            throw new Error(`Forum with ID ${id} not found`);
        }
        if (!forum.photo) {
            throw new Error(`No photo found for Forum ${id}`);
        }

        return this.fichiersService.downloadFile(forum.photo);
    }
}
