import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConcoursSubmissionsService } from './concours-submissions.service';
import { CreateConcoursSubmissionDto } from './dto/create-concours-submission.dto';
import { ApproveConcoursSubmissionDto } from './dto/approve-concours-submission.dto';
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
    decline(@CurrentCountry() pays: string, @Param('id') id: string) {
        return this.submissionsService.decline(pays, +id);
    }
}
