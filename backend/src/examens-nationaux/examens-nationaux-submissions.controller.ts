import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExamensNationauxSubmissionsService } from './examens-nationaux-submissions.service';
import { CreateExamenNationalSubmissionDto } from './dto/create-examen-national-submission.dto';
import { ResoudreExamenNationalSubmissionDto } from './dto/resoudre-examen-national-submission.dto';
import { ApproveExamenNationalSubmissionDto, DeclinerExamenNationalSubmissionDto, ExamenNationalSubmissionsQueryDto } from './dto/examen-national-submission-misc.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permission.enum';
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

    @Get()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.EXAMENS_NATIONAUX_READ)
    @ApiOperation({ summary: 'Lister les soumissions (Admin)' })
    findAll(@CurrentCountry() pays: string, @Query() query: ExamenNationalSubmissionsQueryDto) {
        return this.service.findAll(pays, query.status, query, {
            type_examen: query.type_examen, matiere_examen: query.matiere_examen, filiere_examen: query.filiere_examen,
        });
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.EXAMENS_NATIONAUX_UPDATE)
    @ApiOperation({ summary: 'Modifier une soumission en attente (Admin) — type/série/matière (id ou proposé), section, année' })
    update(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: ResoudreExamenNationalSubmissionDto) {
        return this.service.resolveSubmission(pays, +id, body);
    }

    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.EXAMENS_NATIONAUX_VALIDATE)
    @ApiOperation({ summary: 'Approuver une soumission (Admin) → crée l\'examen national + email' })
    approve(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: ApproveExamenNationalSubmissionDto) {
        return this.service.approve(pays, +id, body);
    }

    @Patch(':id/decline')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.EXAMENS_NATIONAUX_VALIDATE)
    @ApiOperation({ summary: 'Refuser une soumission (Admin) + email à l\'auteur' })
    decline(@CurrentCountry() pays: string, @Param('id') id: string, @Body() body: DeclinerExamenNationalSubmissionDto) {
        return this.service.decline(pays, +id, body?.reason);
    }
}
