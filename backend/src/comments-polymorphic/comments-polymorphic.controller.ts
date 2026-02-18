import { Controller, Get, Post, Body, Param, Delete, Req, ParseIntPipe, UseGuards, Query, DefaultValuePipe } from '@nestjs/common';
import { CommentsPolymorphicService } from './comments-polymorphic.service';
import { CreateCommentPolymorphicDto } from './dto/create-comment-polymorphic.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('commentaires')
@Controller('commentaires')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsPolymorphicController {
    constructor(private readonly commentsService: CommentsPolymorphicService) { }

    @Post(':model/:id')
    @ApiOperation({ summary: 'Créer un commentaire pour une entité' })
    @ApiParam({ name: 'model', description: 'Nom du modèle cible (Valeurs acceptées: Forums, Parcours, Commentaires, etc.)' })
    @ApiParam({ name: 'id', description: 'ID de l\'entité cible' })
    create(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number,
        @Body() createDto: CreateCommentPolymorphicDto,
        @Req() req
    ) {
        const userId = req.user.utilisateurId;
        return this.commentsService.create(model, id, createDto, userId);
    }

    @Get(':model/:id/count')
    @ApiOperation({ summary: 'Obtenir le nombre total de commentaires pour une entité' })
    @ApiParam({ name: 'model', description: 'Nom du modèle cible' })
    @ApiParam({ name: 'id', description: 'ID de l\'entité cible' })
    count(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.commentsService.countComments(model, id);
    }

    @Get(':model/:id')
    @ApiOperation({ summary: 'Obtenir les commentaires racines pour une entité' })
    @ApiParam({ name: 'model', description: 'Nom du modèle cible (Valeurs acceptées: Forums, Parcours, Commentaires, etc.)' })
    @ApiParam({ name: 'id', description: 'ID de l\'entité cible' })
    findAllByEntity(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number,
        @Query() paginationDto: PaginationDto,
        @Req() req
    ) {
        const userId = req.user.utilisateurId;
        return this.commentsService.findAllByEntity(model, id, paginationDto, userId);
    }

    @Delete(':model/:id')
    @ApiOperation({ summary: 'Supprimer un commentaire et ses enfants' })
    @ApiParam({ name: 'model', description: 'Nom du modèle cible (ex: Forums, Parcours, Commentaires, etc.)' })
    @ApiParam({ name: 'id', description: 'ID du commentaire à supprimer' })
    remove(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.commentsService.remove(model, id);
    }
}
