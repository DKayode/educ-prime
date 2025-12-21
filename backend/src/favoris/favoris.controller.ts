import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { FavorisService } from './favoris.service';
import { CreateFavoriDto } from './dto/create-favoris.dto';
import { UpdateFavorisDto } from './dto/update-favoris.dto';
import { FavoriQueryDto } from './dto/favoris-query.dto';
import { Favori } from './entities/favoris.entity';

@ApiTags('favoris')
@Controller('favoris')
export class FavorisController {
  constructor(private readonly favorisService: FavorisService) { }

  @Post()
  @ApiOperation({ summary: 'Ajouter un parcours aux favoris' })
  @ApiResponse({ status: 201, description: 'Favori ajouté avec succès', type: Favori })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Parcours non trouvé' })
  @ApiResponse({ status: 409, description: 'Parcours déjà dans les favoris' })
  async create(@Body() createFavoriDto: CreateFavoriDto): Promise<Favori> {
    return await this.favorisService.create(createFavoriDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les favoris avec pagination et filtres' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'parcours_id', required: false, type: String, description: 'Filtrer par ID de parcours' })
  @ApiQuery({ name: 'utilisateur_id', required: false, type: String, description: 'Filtrer par ID d\'utilisateur' })
  @ApiQuery({ name: 'date_debut', required: false, type: Date, description: 'Date de début' })
  @ApiQuery({ name: 'date_fin', required: false, type: Date, description: 'Date de fin' })
  @ApiResponse({ status: 200, description: 'Liste des favoris récupérée avec succès' })
  async findAll(@Query() query: FavoriQueryDto) {
    return await this.favorisService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Récupérer les statistiques des favoris' })
  @ApiQuery({ name: 'parcours_id', required: false, type: String, description: 'ID du parcours pour les statistiques' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats(@Query('parcours_id') parcoursId?: number) {
    return await this.favorisService.getStats(parcoursId);
  }

  @Get('check/:parcoursId/:userId')
  @ApiOperation({ summary: 'Vérifier si un parcours est dans les favoris d\'un utilisateur' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'État du favori vérifié avec succès' })
  async isFavori(
    @Param('parcoursId', ParseUUIDPipe) parcoursId: number,
    @Param('userId') userId: number,
  ): Promise<{ isFavori: boolean }> {
    const isFavori = await this.favorisService.isFavori(parcoursId, userId);
    return { isFavori };
  }

  @Get('parcours/:parcoursId/count')
  @ApiOperation({ summary: 'Récupérer le nombre de favoris d\'un parcours' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Nombre de favoris récupéré avec succès' })
  async getFavoriCount(@Param('parcoursId') parcoursId: number): Promise<{ count: number }> {
    const count = await this.favorisService.getFavoriCount(parcoursId);
    return { count };
  }

  @Get('parcours/:parcoursId')
  @ApiOperation({ summary: 'Récupérer les favoris d\'un parcours' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Favoris du parcours récupérés avec succès' })
  async findByParcours(
    @Param('parcoursId') parcoursId: number,
    @Query() query: FavoriQueryDto,
  ) {
    return await this.favorisService.findByParcours(parcoursId, query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Récupérer les favoris d\'un utilisateur' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Favoris de l\'utilisateur récupérés avec succès' })
  async findByUser(
    @Param('userId') userId: number,
    @Query() query: FavoriQueryDto,
  ) {
    return await this.favorisService.findByUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un favori par son ID' })
  @ApiParam({ name: 'id', description: 'ID du favori' })
  @ApiResponse({ status: 200, description: 'Favori récupéré avec succès', type: Favori })
  @ApiResponse({ status: 404, description: 'Favori non trouvé' })
  async findOne(@Param('id') id: number): Promise<Favori> {
    return await this.favorisService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un favori' })
  @ApiParam({ name: 'id', description: 'ID du favori à mettre à jour' })
  @ApiResponse({ status: 200, description: 'Favori mis à jour avec succès', type: Favori })
  @ApiResponse({ status: 404, description: 'Favori non trouvé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: number,
    @Body() updateFavoriDto: UpdateFavorisDto,
  ): Promise<Favori> {
    return await this.favorisService.update(id, updateFavoriDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un favori par son ID' })
  @ApiParam({ name: 'id', description: 'ID du favori à supprimer' })
  @ApiResponse({ status: 204, description: 'Favori supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Favori non trouvé' })
  async remove(@Param('id') id: number): Promise<void> {
    await this.favorisService.remove(id);
  }

  @Delete('parcours/:parcoursId/user/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un favori par parcours et utilisateur' })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiParam({ name: 'userId', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 204, description: 'Favori supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Favori non trouvé' })
  async removeByParcoursAndUser(
    @Param('parcoursId') parcoursId: number,
    @Param('userId') userId: number,
  ): Promise<void> {
    await this.favorisService.removeByParcoursAndUser(parcoursId, userId);
  }
}