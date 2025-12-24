import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EtablissementsService } from './etablissements.service';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';
import { FilterEpreuveDto } from '../epreuves/dto/filter-epreuve.dto';
import { FilterRessourceDto } from '../ressources/dto/filter-ressource.dto';
import { FilterEtablissementDto } from './dto/filter-etablissement.dto';
import { FilterFiliereDto } from '../filieres/dto/filter-filiere.dto';
import { FilterNiveauEtudeDto } from '../niveau-etude/dto/filter-niveau-etude.dto';
import { FilterMatiereDto } from '../matieres/dto/filter-matiere.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FichiersService } from '../fichiers/fichiers.service';

@ApiTags('etablissements')
@Controller('etablissements')
export class EtablissementsController {
  constructor(
    private readonly etablissementsService: EtablissementsService,
    private readonly fichiersService: FichiersService
  ) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  async create(@Body() creerEtablissementDto: CreerEtablissementDto) {
    return this.etablissementsService.create(creerEtablissementDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des établissements' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale (nom ou ville)' })
  async findAll(@Query() filterDto: FilterEtablissementDto) {
    return this.etablissementsService.findAll(filterDto);
  }

  @Get(':id/logo')
  async downloadLogo(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { buffer, contentType, filename } = await this.etablissementsService.getLogo(id);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.etablissementsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majEtablissementDto: MajEtablissementDto) {
    return this.etablissementsService.update(id, majEtablissementDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.etablissementsService.remove(id);
  }

  // Hierarchical navigation endpoints
  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findFilieres(@Param('id') id: string, @Query() filterDto: FilterFiliereDto) {
    return this.etablissementsService.findFilieresById(id, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findNiveauEtude(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Query() filterDto: FilterNiveauEtudeDto,
  ) {
    return this.etablissementsService.findNiveauEtudeByFiliere(etablissementId, filiereId, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/matieres')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findMatieres(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
    @Query() filterDto: FilterMatiereDto,
  ) {
    return this.etablissementsService.findMatieresByNiveauEtude(etablissementId, filiereId, niveauEtudeId, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/epreuves')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale (titre ou matière)' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'matiere', required: false, type: String })
  async findEpreuves(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
    @Query() filterDto: FilterEpreuveDto,
  ) {
    return this.etablissementsService.findEpreuvesByNiveauEtudeAndFilters(
      etablissementId,
      filiereId,
      niveauEtudeId,
      filterDto
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/ressources')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale (titre ou matière)' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'matiere', required: false, type: String })
  async findRessources(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
    @Query() filterDto: FilterRessourceDto,
  ) {
    return this.etablissementsService.findRessourcesByNiveauEtudeAndFilters(
      etablissementId,
      filiereId,
      niveauEtudeId,
      filterDto
    );
  }
}