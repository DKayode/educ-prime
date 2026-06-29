import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConcoursSubmissionsService } from './concours-submissions.service';
import { CreateConcoursSubmissionDto } from './dto/create-concours-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
}
