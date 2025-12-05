import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { EtablissementsService } from './etablissements.service';
import { CreerEtablissementDto } from './dto/creer-etablissement.dto';
import { MajEtablissementDto } from './dto/maj-etablissement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@Controller('etablissements')
export class EtablissementsController {
  constructor(private readonly etablissementsService: EtablissementsService) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  async create(@Body() creerEtablissementDto: CreerEtablissementDto) {
    return this.etablissementsService.create(creerEtablissementDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.etablissementsService.findAll();
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
  async findFilieres(@Param('id') id: string) {
    return this.etablissementsService.findFilieresById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude')
  async findNiveauEtude(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
  ) {
    return this.etablissementsService.findNiveauEtudeByFiliere(etablissementId, filiereId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/matieres')
  async findMatieres(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
  ) {
    return this.etablissementsService.findMatieresByNiveauEtude(etablissementId, filiereId, niveauEtudeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/matieres/:matiereId/epreuves')
  async findEpreuves(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
    @Param('matiereId') matiereId: string,
  ) {
    return this.etablissementsService.findEpreuvesByMatiere(etablissementId, filiereId, niveauEtudeId, matiereId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/filieres/:filiereId/niveau-etude/:niveauId/matieres/:matiereId/ressources')
  async findRessources(
    @Param('id') etablissementId: string,
    @Param('filiereId') filiereId: string,
    @Param('niveauId') niveauEtudeId: string,
    @Param('matiereId') matiereId: string,
  ) {
    return this.etablissementsService.findRessourcesByMatiere(etablissementId, filiereId, niveauEtudeId, matiereId);
  }
}