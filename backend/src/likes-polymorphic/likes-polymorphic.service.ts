import { Injectable, BadRequestException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { LikeUser } from './entities/like-user.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';

const VALID_MODELS = ['Forums', 'Parcours', 'Commentaires'];

@Injectable()
export class LikesPolymorphicService {
    constructor(private readonly resolver: DataSourceResolver) { }

    private get likesRepository(): Repository<LikeUser> {
        return this.resolver.getRepository(LikeUser);
    }

    private assertValidModel(model: string) {
        if (!VALID_MODELS.includes(model)) {
            throw new BadRequestException(
                `Invalid model: ${model}. Valid models are: ${VALID_MODELS.join(', ')}`,
            );
        }
    }

    async toggleLike(pays: string, model: string, id: number, userId: number) {
        this.assertValidModel(model);

        const existing = await this.likesRepository.findOne({
            where: { likeable_id: String(id), likeable_type: model, user_id: userId },
        });

        if (existing) {
            await this.likesRepository.remove(existing);
            return { status: 'unliked', model, id };
        }

        const like = this.likesRepository.create({
            pays,
            likeable_id: String(id),
            likeable_type: model,
            user_id: userId,
        });
        await this.likesRepository.save(like);
        return { status: 'liked', model, id };
    }

    async countLikes(model: string, id: number): Promise<number> {
        this.assertValidModel(model);
        return this.likesRepository.count({
            where: { likeable_id: String(id), likeable_type: model },
        });
    }

    async isLiked(model: string, id: number, userId: number): Promise<boolean> {
        const count = await this.likesRepository.count({
            where: { likeable_id: String(id), likeable_type: model, user_id: userId },
        });
        return count > 0;
    }

    async getLikedIdsByUser(model: string, ids: number[], userId: number): Promise<number[]> {
        this.assertValidModel(model);
        if (ids.length === 0) return [];

        const likes = await this.likesRepository.find({
            where: {
                likeable_type: model,
                user_id: userId,
                likeable_id: In(ids.map(id => String(id))),
            },
            select: ['likeable_id'],
        });
        return likes.map(like => Number(like.likeable_id));
    }

    async getLikesCounts(model: string, ids: number[]): Promise<Map<number, number>> {
        if (ids.length === 0) return new Map();

        const rows = await this.likesRepository.createQueryBuilder('like')
            .select('like.likeable_id', 'likeable_id')
            .addSelect('COUNT(like.id)', 'count')
            .where('like.likeable_type = :type', { type: model })
            .andWhere('like.likeable_id IN (:...ids)', { ids: ids.map(id => String(id)) })
            .groupBy('like.likeable_id')
            .getRawMany<{ likeable_id: string, count: string }>();

        return new Map(rows.map(r => [Number(r.likeable_id), parseInt(r.count, 10)]));
    }
}
