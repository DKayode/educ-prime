import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EpreuveSubmissionsService } from './epreuve-submissions.service';
import { CreerSubmissionDto } from './dto/creer-submission.dto';
import { ResoudreSubmissionDto } from './dto/resoudre-submission.dto';
import { DeclinerSubmissionDto } from './dto/decliner-submission.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';
import { EpreuveType } from '../entities/epreuve.entity';
import { CurrentCountry } from '../../common/decorators/current-country.decorator';

// Mounted at 'epreuves/submissions'; registered BEFORE EpreuvesController so
// GET /epreuves/submissions is not shadowed by GET /epreuves/:id.
@ApiTags('epreuve-submissions')
@Controller('epreuves/submissions')
export class EpreuveSubmissionsController {
  constructor(private readonly submissionsService: EpreuveSubmissionsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: "STEP 1 — soumettre une épreuve (tout utilisateur connecté). Le fichier suit via /files/epreuve_submissions/:uuid/file." })
  @ApiResponse({ status: 201, description: 'Soumission créée (pending_approval), renvoie uuid + parents manquants' })
  @ApiResponse({ status: 409, description: 'Une épreuve identique existe déjà (tous les parents existent)' })
  async create(@CurrentCountry() pays: string, @Request() req, @Body() dto: CreerSubmissionDto) {
    return this.submissionsService.createSubmission(pays, dto, req.user.utilisateurId);
  }

  // Registered BEFORE the admin @Get() so 'mine' is never captured as a param.
  // JwtAuthGuard only (any authenticated user, NOT admin) — returns ONLY the
  // caller's own submissions, pays-scoped.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  @ApiOperation({ summary: 'Mes soumissions d\'épreuves — les soumissions de l\'utilisateur connecté, infos associées résolues/proposées' })
  @ApiQuery({ name: 'status', required: false, enum: ServiceStatusEnum, description: 'Filtrer par statut (défaut: tous)' })
  @ApiQuery({ name: 'type', required: false, enum: [EpreuveType.EXAMENS, EpreuveType.EXAMEN_NATIONAL], description: "Filtrer par type d'épreuve (Examens ou Examens Nationaux)" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMine(
    @CurrentCountry() pays: string,
    @Request() req,
    @Query('status') status?: ServiceStatusEnum,
    @Query('type') type?: EpreuveType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.submissionsService.findMine(pays, req.user.utilisateurId, {
      status,
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Lister les soumissions (Admin) — parents manquants signalés' })
  @ApiQuery({ name: 'status', required: false, enum: ServiceStatusEnum, description: 'Filtrer par statut (ex: pending_approval)' })
  @ApiQuery({ name: 'type', required: false, enum: [EpreuveType.EXAMENS, EpreuveType.EXAMEN_NATIONAL], description: "Filtrer par type d'épreuve (Examens ou Examens Nationaux)" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentCountry() pays: string,
    @Query('status') status?: ServiceStatusEnum,
    @Query('type') type?: EpreuveType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.submissionsService.findAllForAdmin(pays, {
      status,
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Résoudre les parents manquants (Admin) — attache des ids réels' })
  @ApiResponse({ status: 200, description: 'Parents mis à jour' })
  async resolve(@Param('id', ParseIntPipe) id: number, @Body() dto: ResoudreSubmissionDto) {
    return this.submissionsService.resolveParents(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approuver une soumission (Admin) — crée la vraie épreuve, notifie l\'auteur' })
  @ApiResponse({ status: 200, description: 'Épreuve créée, soumission approuvée, auteur notifié' })
  @ApiResponse({ status: 400, description: 'Des parents ne sont pas encore résolus' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.submissionsService.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @Patch(':id/decline')
  @ApiOperation({ summary: 'Refuser une soumission (Admin) — notifie l\'auteur' })
  @ApiResponse({ status: 200, description: 'Soumission refusée, auteur notifié' })
  async decline(@Param('id', ParseIntPipe) id: number, @Body() dto: DeclinerSubmissionDto) {
    return this.submissionsService.decline(id, dto?.reason);
  }
}
