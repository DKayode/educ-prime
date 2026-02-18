import { Controller, Get, Post, Body, Param, Delete, Req, ParseIntPipe, UseGuards, Query, DefaultValuePipe, Put } from '@nestjs/common';
import { CommentsPolymorphicService } from './comments-polymorphic.service';
import { CreateCommentPolymorphicDto } from './dto/create-comment-polymorphic.dto';
import { UpdateCommentPolymorphicDto } from './dto/update-comment-polymorphic.dto';
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
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer les commentaires' })
    @ApiParam({ name: 'model', description: 'Nom du modèle (ex: Forums)' })
    @ApiParam({ name: 'id', description: 'ID de l\'entité commentée' })
    @ApiResponse({ status: 200, description: 'Liste des commentaires récupérée.' })
    findAllByEntity(
        @Param('model') model: string,
        @Param('id') id: string,
        @Query() paginationDto: PaginationDto,
        @Req() req
    ) {
        const userId = req.user.utilisateurId;
        return this.commentsService.findAllByEntity(model, +id, paginationDto, userId);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mettre à jour un commentaire' })
    @ApiParam({ name: 'id', description: 'ID du commentaire à modifier' })
    @ApiResponse({ status: 200, description: 'Le commentaire a été mis à jour.' })
    @ApiResponse({ status: 404, description: 'Commentaire introuvable.' })
    @ApiResponse({ status: 403, description: 'Non autorisé à modifier ce commentaire.' })
    update(
        @Param('id') id: string,
        @Body() updateCommentDto: UpdateCommentPolymorphicDto,
        @Req() req
    ) {
        const userId = req.user.utilisateurId;
        return this.commentsService.update(+id, updateCommentDto, userId);
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
