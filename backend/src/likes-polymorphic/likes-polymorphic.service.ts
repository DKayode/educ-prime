import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesPolymorphicService {
    constructor(private readonly prisma: PrismaService) { }

    async toggleLike(model: string, id: number, userId: number) {
        // Validate model if necessary
        const validModels = ['Forums', 'Parcours', 'Commentaires'];
        if (!validModels.includes(model)) {
            throw new BadRequestException(`Invalid model: ${model}. Valid models are: Forums, Parcours, Commentaires`);
        }

        // Check if like exists
        const existingLike = await this.prisma.likeUser.findFirst({
            where: {
                likeable_id: BigInt(id), // Assuming ID passed is number, convert to BigInt
                likeable_type: model,
                user_id: userId,
            },
        });

        if (existingLike) {
            // Remove like
            await this.prisma.likeUser.delete({
                where: { id: existingLike.id },
            });
            return { status: 'unliked', model, id };
        } else {
            // Create like
            await this.prisma.likeUser.create({
                data: {
                    likeable_id: BigInt(id),
                    likeable_type: model,
                    user_id: userId,
                },
            });
            return { status: 'liked', model, id };
        }
    }

    // Helper to count likes (can be used by other services)
    // Helper to count likes (can be used by other services)
    async countLikes(model: string, id: number): Promise<number> {
        const validModels = ['Forums', 'Parcours', 'Commentaires'];
        if (!validModels.includes(model)) {
            throw new BadRequestException(`Invalid model: ${model}. Valid models are: Forums, Parcours, Commentaires`);
        }

        return this.prisma.likeUser.count({
            where: {
                likeable_id: BigInt(id),
                likeable_type: model,
            },
        });
    }

    // Helper to check if user liked
    async isLiked(model: string, id: number, userId: number): Promise<boolean> {
        const count = await this.prisma.likeUser.count({
            where: {
                likeable_id: BigInt(id),
                likeable_type: model,
                user_id: userId,
            },
        });
        return count > 0;
    }
}
