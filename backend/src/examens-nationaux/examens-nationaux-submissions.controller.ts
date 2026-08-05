import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExamensNationauxSubmissionsService } from './examens-nationaux-submissions.service';
import { CreateExamenNationalSubmissionDto } from './dto/create-examen-national-submission.dto';
import { ResoudreExamenNationalSubmissionDto } from './dto/resoudre-examen-national-submission.dto';
import { ApproveExamenNationalSubmissionDto, DeclinerExamenNationalSubmissionDto, ExamenNationalSubmissionsQueryDto } from './dto/examen-national-submission-misc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('examens-nationaux-submissions')
@Controller('examens-nationaux/submissions')
export class ExamensNationauxSubmissionsController {
    constructor(private readonly service: ExamensNationauxSubmissionsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    @ApiOperation({ summary: 'Soumettre un examen national (tout utilisateur authentifié)' })
    create(@CurrentCountry() pays: string, @Request() req, @Body() dto: CreateExamenNationalSubmissionDto) {
        return this.service.createSubmission(pays, req.user.utilisateurId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('mine')
    @ApiOperation({ summary: 'Mes soumissions d\'examens nationaux' })
    findMine(@CurrentCountry() pays: string, @Request() req, @Query() query: ExamenNationalSubmissionsQueryDto) {
        return this.service.findMine(pays, req.user.utilisateurId, query.status, query, {
            type_examen: query.type_examen, matiere_examen: query.matiere_examen, filiere_examen: query.filiere_examen,
        });
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Get()
    @ApiOperation({ summary: 'Lister les soumissions (Admin)' })
    findAll(@CurrentCountry() pays: string, @Query() query: ExamenNationalSubmissionsQueryDto) {
        return this.service.findAll(pays, query.status, query, {
            type_examen: query.type_examen, matiere_examen: query.matiere_examen, filiere_examen: query.filiere_examen,
        });
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id')
    @ApiOperation({ summary: 'Modifier une soumission en attente (Admin) — type/série/matière (id ou proposé), section, année' })
    update(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: ResoudreExamenNationalSubmissionDto) {
        return this.service.resolveSubmission(pays, +id, body);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approuver une soumission (Admin) → crée l\'examen national + email' })
    approve(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: ApproveExamenNationalSubmissionDto) {
        return this.service.approve(pays, +id, body);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id/decline')
    @ApiOperation({ summary: 'Refuser une soumission (Admin) + email à l\'auteur' })
    decline(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: DeclinerExamenNationalSubmissionDto) {
        return this.service.decline(pays, +id, body?.reason);
    }
}
