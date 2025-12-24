import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CommentairesService } from './commentaires.service';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { UpdateCommentaireDto } from './dto/update-commentaire.dto';
import { CommentaireQueryDto } from './dto/commentaire-query.dto';
import { Commentaire } from './entities/commentaire.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { OwnerOrAdminGuard } from 'src/auth/guards/owner-or-admin.guard';
import { GetUser } from 'src/auth/guards/get-user.guard';

@ApiTags('commentaires')
@Controller('commentaires')
export class CommentairesController {
  constructor(private readonly commentairesService: CommentairesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Créer un nouveau commentaire' })
  @ApiResponse({ status: 201, description: 'Commentaire créé avec succès', type: Commentaire })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Parcours ou commentaire parent non trouvé' })
  async create(@Body() createCommentaireDto: CreateCommentaireDto, @GetUser() user: any): Promise<Commentaire> {
    const userId = user.userId
    return await this.commentairesService.create(createCommentaireDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les commentaires avec pagination et filtres' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'parcours_id', required: false, type: String, description: 'Filtrer par ID de parcours' })
  @ApiQuery({ name: 'utilisateur_id', required: false, type: String, description: 'Filtrer par ID d\'utilisateur' })
  @ApiQuery({ name: 'parent_id', required: false, type: String, description: 'Filtrer par ID de commentaire parent' })
  @ApiQuery({ name: 'contenu', required: false, type: String, description: 'Filtrer par contenu' })
  @ApiQuery({ name: 'date_debut', required: false, type: Date, description: 'Date de début' })
  @ApiQuery({ name: 'date_fin', required: false, type: Date, description: 'Date de fin' })
  @ApiResponse({ status: 200, description: 'Liste des commentaires récupérée avec succès' })
  async findAll(@Query() query: CommentaireQueryDto) {
    return await this.commentairesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Récupérer les statistiques des commentaires' })
  @ApiQuery({ name: 'parcours_id', required: false, type: String, description: 'ID du parcours pour les statistiques' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats(@Query('parcours_id') parcoursId?: number) {
    return await this.commentairesService.getStats(parcoursId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un commentaire par son ID' })
  @ApiParam({ name: 'id', description: 'ID du commentaire' })
  @ApiResponse({ status: 200, description: 'Commentaire récupéré avec succès', type: Commentaire })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé' })
  async findOne(@Param('id') id: number): Promise<Commentaire> {
    return await this.commentairesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/replies')
  @ApiOperation({ summary: 'Récupérer les réponses d\'un commentaire' })
  @ApiParam({ name: 'id', description: 'ID du commentaire parent' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Réponses récupérées avec succès' })
  async findReplies(
    @Param('id') id: number,
    @Query() query: CommentaireQueryDto,
  ) {
    return await this.commentairesService.findReplies(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('parcours/:parcoursId')
  @ApiOperation({ summary: 'Récupérer les commentaires d\'un parcours' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Commentaires du parcours récupérés avec succès' })
  async findByParcours(
    @Param('parcoursId') parcoursId: number,
    @Query() query: CommentaireQueryDto,
  ) {
    return await this.commentairesService.findByParcours(parcoursId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  @ApiOperation({ summary: 'Récupérer les commentaires de l\'utilisateur connecté' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Commentaires de l\'utilisateur récupérés avec succès' })
  async findByUser(
    @GetUser() user: any,
    @Query() query: CommentaireQueryDto,
  ) {
    const userId = user.userId;
    return await this.commentairesService.findByUser(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un commentaire' })
  @ApiParam({ name: 'id', description: 'ID du commentaire à mettre à jour' })
  @ApiResponse({ status: 200, description: 'Commentaire mis à jour avec succès', type: Commentaire })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: number,
    @Body() updateCommentaireDto: UpdateCommentaireDto,
  ): Promise<Commentaire> {
    return await this.commentairesService.update(id, updateCommentaireDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un commentaire' })
  @ApiParam({ name: 'id', description: 'ID du commentaire à supprimer' })
  @ApiResponse({ status: 204, description: 'Commentaire supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Commentaire non trouvé' })
  async remove(@Param('id') id: number): Promise<void> {
    await this.commentairesService.remove(id);
  }
}