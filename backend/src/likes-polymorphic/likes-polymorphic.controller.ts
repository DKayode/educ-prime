import { Controller, Get, Post, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { LikesPolymorphicService } from './likes-polymorphic.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('likes')
@Controller('likes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LikesPolymorphicController {
    constructor(private readonly likesService: LikesPolymorphicService) { }

    @Post(':model/:id')
    @ApiOperation({ summary: 'Ajouter ou supprimer un like (Toggle)' })
    @ApiParam({ name: 'model', description: 'Nom du modèle cible (Valeurs acceptées: Forum, Commentaire, CommentaireAll, Parcours)' })
    @ApiParam({ name: 'id', description: 'ID de l\'entité cible' })
    async toggleLike(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number,
        @Req() req,
    ) {
        const userId = req.user.utilisateurId;
        // Map URL param to internal model name if needed, but requirements say "Forum" and "Commentaire".
        // We pass them directly.
        return this.likesService.toggleLike(model, id, userId);
    }

    @Get(':model/:id/count')
    @ApiOperation({ summary: 'Obtenir le nombre de likes pour un modèle' })
    @ApiParam({ name: 'model', description: 'Nom du modèle cible (Valeurs acceptées: Forum, Commentaire, CommentaireAll, Parcours)' })
    @ApiParam({ name: 'id', description: 'ID de l\'entité cible' })
    async getLikeCount(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const count = await this.likesService.countLikes(model, id);
        return { totalLikes: count };
    }
}
