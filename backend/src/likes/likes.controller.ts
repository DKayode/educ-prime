import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, ParseUUIDPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { UpdateLikeDto } from './dto/update-like.dto';
import { LikeQueryDto, LikeType } from './dto/like-query.dto';
import { Like } from './entities/like.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/auth/guards/get-user.guard';

@ApiTags('likes')
@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Ajouter un like/dislike' })
  @ApiResponse({ status: 201, description: 'Like ajouté avec succès', type: Like })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Ressource non trouvée' })
  async create(@Body() createLikeDto: CreateLikeDto, @Request() req: any,): Promise<Like> {
    const userId = req.user;
    return await this.likesService.like(createLikeDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les likes avec pagination et filtres' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'parcours_id', required: false, type: Number, description: 'Filtrer par ID de parcours' })
  @ApiQuery({ name: 'commentaire_id', required: false, type: Number, description: 'Filtrer par ID de commentaire' })
  @ApiQuery({ name: 'utilisateur_id', required: false, type: Number, description: 'Filtrer par ID d\'utilisateur' })
  @ApiQuery({ name: 'type', required: false, enum: LikeType, description: 'Filtrer par type' })
  @ApiResponse({ status: 200, description: 'Liste des likes récupérée avec succès' })
  async findAll(@Query() query: LikeQueryDto) {
    return await this.likesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check')
  @ApiOperation({ summary: 'Vérifier si un utilisateur a liké une ressource' })
  @ApiQuery({ name: 'user_id', required: true, type: Number, description: 'ID de l\'utilisateur' })
  @ApiQuery({ name: 'parcours_id', required: false, type: Number, description: 'ID du parcours' })
  @ApiQuery({ name: 'commentaire_id', required: false, type: Number, description: 'ID du commentaire' })
  @ApiResponse({ status: 200, description: 'État du like récupéré avec succès' })
  async checkUserLike(
    @Query('user_id') userId: number,
    @Query('parcours_id') parcoursId?: number,
    @Query('commentaire_id') commentaireId?: number,
  ) {
    return await this.likesService.checkUserLike(userId, parcoursId, commentaireId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('parcours/:parcoursId/stats')
  @ApiOperation({ summary: 'Récupérer les statistiques de likes d\'un parcours' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getParcoursStats(@Param('parcoursId') parcoursId: number) {
    return await this.likesService.getParcoursStats(parcoursId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('parcours/:parcoursId/likers')
  @ApiOperation({ summary: 'Récupérer les utilisateurs qui ont liké un parcours' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiQuery({ name: 'type', required: false, enum: LikeType, description: 'Type de like' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des likers récupérée avec succès' })
  async getParcoursLikers(
    @Param('parcoursId', ParseUUIDPipe) parcoursId: number,
    @Query('type') type?: LikeType,
    @Query() query?: LikeQueryDto,
  ) {
    return await this.likesService.getLikers(parcoursId, undefined, type, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('commentaire/:commentaireId/likers')
  @ApiOperation({ summary: 'Récupérer les utilisateurs qui ont liké un commentaire' })
  @ApiParam({ name: 'commentaireId', description: 'ID du commentaire' })
  @ApiQuery({ name: 'type', required: false, enum: LikeType, description: 'Type de like' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des likers récupérée avec succès' })
  async getCommentaireLikers(
    @Param('commentaireId', ParseUUIDPipe) commentaireId: number,
    @Query('type') type?: LikeType,
    @Query() query?: LikeQueryDto,
  ) {
    return await this.likesService.getLikers(undefined, commentaireId, type, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  @ApiOperation({ summary: 'Récupérer les likes d\'un utilisateur' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Likes de l\'utilisateur récupérés avec succès' })
  async findByUser(
    @Param('userId') userId: number,
    @Query() query: LikeQueryDto,
  ) {
    return await this.likesService.findByUser(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un like par son ID' })
  @ApiParam({ name: 'id', description: 'ID du like' })
  @ApiResponse({ status: 200, description: 'Like récupéré avec succès', type: Like })
  @ApiResponse({ status: 404, description: 'Like non trouvé' })
  async findOne(@Param('id') id: number): Promise<Like> {
    return await this.likesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Mettre à jour un like' })
  @ApiParam({ name: 'id', description: 'ID du like à mettre à jour' })
  @ApiResponse({ status: 200, description: 'Like mis à jour avec succès', type: Like })
  @ApiResponse({ status: 403, description: 'Non autorisé à modifier ce like' })
  @ApiResponse({ status: 404, description: 'Like non trouvé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: number,
    @Body() updateLikeDto: UpdateLikeDto,
    @Request() req: any,
  ): Promise<Like> {
    const userId = req.user;
    return await this.likesService.update(id, updateLikeDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un like' })
  @ApiParam({ name: 'id', description: 'ID du like à supprimer' })
  @ApiResponse({ status: 204, description: 'Like supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Like non trouvé' })
  async remove(@Param('id') id: number): Promise<void> {
    await this.likesService.remove(id);
  }
}