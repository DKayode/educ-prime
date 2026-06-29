import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EpreuveSubmissionsService } from './epreuve-submissions.service';
import { CreerSubmissionDto } from './dto/creer-submission.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentCountry } from '../../common/decorators/current-country.decorator';

// Mounted at 'epreuves/submissions'; registered BEFORE EpreuvesController so
// GET /epreuves/submissions (added in V2-D4) is not shadowed by GET /epreuves/:id.
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
}
