import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ParcoursService } from './parcours.service';
import { CreateParcourDto } from './dto/create-parcour.dto';
import { UpdateParcourDto } from './dto/update-parcour.dto';
import { ParcourQueryDto } from './dto/parcour-query.dto';
import { Parcour } from './entities/parcour.entity';

@ApiTags('parcours')
@Controller('parcours')
export class ParcoursController {
  constructor(private readonly parcoursService: ParcoursService) { }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau parcours' })
  @ApiResponse({ status: 201, description: 'Parcours créé avec succès', type: Parcour })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(@Body() createParcoursDto: CreateParcourDto): Promise<Parcour> {
    return await this.parcoursService.create(createParcoursDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les parcours avec pagination et filtres' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'titre', required: false, type: String, description: 'Filtrer par titre' })
  @ApiQuery({ name: 'categorie', required: false, type: String, description: 'Filtrer par catégorie' })
  @ApiQuery({ name: 'type_media', required: false, enum: ['image', 'video'], description: 'Filtrer par type de média' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale' })
  @ApiResponse({ status: 200, description: 'Liste des parcours récupérée avec succès' })
  async findAll(@Query() query: ParcourQueryDto) {
    return await this.parcoursService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un parcours par son ID' })
  @ApiParam({ name: 'id', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Parcours récupéré avec succès', type: Parcour })
  @ApiResponse({ status: 404, description: 'Parcours non trouvé' })
  async findOne(@Param('id') id: number): Promise<Parcour> {
    return await this.parcoursService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un parcours' })
  @ApiParam({ name: 'id', description: 'ID du parcours à mettre à jour' })
  @ApiResponse({ status: 200, description: 'Parcours mis à jour avec succès', type: Parcour })
  @ApiResponse({ status: 404, description: 'Parcours non trouvé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: number,
    @Body() updateParcoursDto: UpdateParcourDto,
  ): Promise<Parcour> {
    return await this.parcoursService.update(id, updateParcoursDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un parcours' })
  @ApiParam({ name: 'id', description: 'ID du parcours à supprimer' })
  @ApiResponse({ status: 204, description: 'Parcours supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Parcours non trouvé' })
  async remove(@Param('id') id: number): Promise<void> {
    await this.parcoursService.remove(id);
  }

  @Get('search/:term')
  @ApiOperation({ summary: 'Rechercher des parcours' })
  @ApiParam({ name: 'term', description: 'Terme de recherche' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite des résultats' })
  @ApiResponse({ status: 200, description: 'Résultats de la recherche' })
  async search(
    @Param('term') term: string,
    @Query('limit') limit?: number,
  ) {
    return await this.parcoursService.search(term, limit);
  }
}