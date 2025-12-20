import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { EtablissementsService } from './etablissements.service';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';
import { FilterEpreuveDto } from '../epreuves/dto/filter-epreuve.dto';
import { FilterRessourceDto } from '../ressources/dto/filter-ressource.dto';
import { FilterEtablissementDto } from './dto/filter-etablissement.dto';
import { FilterFiliereDto } from '../filieres/dto/filter-filiere.dto';
import { FilterNiveauEtudeDto } from '../niveau-etude/dto/filter-niveau-etude.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FichiersService } from '../fichiers/fichiers.service';

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
  async findFilieres(@Param('id') id: string, @Query() filterDto: FilterFiliereDto) {
    return this.etablissementsService.findFilieresById(id, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude')
  async findNiveauEtude(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Query() filterDto: FilterNiveauEtudeDto,
  ) {
    return this.etablissementsService.findNiveauEtudeByFiliere(etablissementId, filiereId, filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/matieres')
  async findMatieres(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.etablissementsService.findMatieresByNiveauEtude(etablissementId, filiereId, niveauEtudeId, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/epreuves')
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
      filterDto.titre,
      filterDto.type,
      filterDto.matiere,
      filterDto
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/ressources')
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
      filterDto.titre,
      filterDto.type,
      filterDto.matiere,
      filterDto
    );
  }
}