import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConcoursSubmissionsService } from './concours-submissions.service';
import { CreateConcoursSubmissionDto } from './dto/create-concours-submission.dto';
import { ApproveConcoursSubmissionDto } from './dto/approve-concours-submission.dto';
import { UpdateConcoursSubmissionDto } from './dto/update-concours-submission.dto';
import { DeclinerConcoursSubmissionDto } from './dto/decliner-concours-submission.dto';
import { SubmissionsQueryDto } from './dto/submissions-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

// NOTE: registered BEFORE ConcoursController in the module's `controllers`
// array so the literal `/concours/submissions` routes resolve before
// ConcoursController's `/concours/:id` param route.
@ApiTags('concours-submissions')
@Controller('concours/submissions')
export class ConcoursSubmissionsController {
    constructor(private readonly submissionsService: ConcoursSubmissionsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    @ApiOperation({ summary: 'Soumettre un concours (tout utilisateur authentifié). Étape 1 : métadonnées ; le fichier suit via /files/concours_submissions/:uuid/file.' })
    @ApiResponse({ status: 201, description: 'Soumission créée (en attente) — renvoie uuid + indicateurs des parents manquants' })
    @ApiResponse({ status: 409, description: 'Un concours identique (structure, titre, année) existe déjà' })
    create(
        @CurrentCountry() pays: string,
        @Request() req,
        @Body() dto: CreateConcoursSubmissionDto,
    ) {
        const userId = req.user.utilisateurId;
        return this.submissionsService.createSubmission(pays, userId, dto);
    }

    // Registered BEFORE the admin @Get() so 'mine' is never captured as a param.
    // JwtAuthGuard only (any authenticated user, NOT admin) — returns ONLY the
    // caller's own submissions, pays-scoped, all statuses unless ?status given.
    @UseGuards(JwtAuthGuard)
    @Get('mine')
    @ApiOperation({ summary: 'Mes soumissions de concours — les soumissions de l\'utilisateur connecté, structure/titre résolus ou proposés' })
    @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut (défaut: tous)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findMine(
        @CurrentCountry() pays: string,
        @Request() req,
        @Query() query: SubmissionsQueryDto,
    ) {
        return this.submissionsService.findMine(pays, req.user.utilisateurId, query.status, query);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Get()
    @ApiOperation({ summary: 'Lister les soumissions de concours (Admin) — structure/titre résolus, parents manquants signalés' })
    @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut (défaut: pending_approval)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @CurrentCountry() pays: string,
        @Query() query: SubmissionsQueryDto,
    ) {
        return this.submissionsService.findAll(pays, query.status, query);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id/resolve')
    @ApiOperation({ summary: 'Modifier une soumission en attente (Admin) — structure/titre (id ou nom proposé), année, lieu' })
    @ApiResponse({ status: 200, description: 'Soumission mise à jour, persistée' })
    resolve(
        @CurrentCountry() pays: string,
        @Param('id') id: string,
        @Body() body: UpdateConcoursSubmissionDto,
    ) {
        return this.submissionsService.resolveSubmission(pays, +id, body);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approuver une soumission (Admin) → crée le concours réel + email à l\'uploader' })
    @ApiResponse({ status: 200, description: 'Soumission approuvée, concours créé' })
    @ApiResponse({ status: 400, description: 'Structure/titre non résolus' })
    approve(
        @CurrentCountry() pays: string,
        @Param('id') id: string,
        @Body() body: ApproveConcoursSubmissionDto,
    ) {
        return this.submissionsService.approve(pays, +id, body);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id/decline')
    @ApiOperation({ summary: 'Refuser une soumission (Admin) + email à l\'uploader' })
    @ApiResponse({ status: 200, description: 'Soumission refusée' })
    decline(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: DeclinerConcoursSubmissionDto) {
        return this.submissionsService.decline(pays, +id, body?.reason);
    }
}
