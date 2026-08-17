import { Body, Controller, Get, Param, ParseIntPipe, Patch, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { KessiahService, kessiahStagingKey } from './kessiah.service';
import { ReviewTranscriptionDto } from './dto/review-transcription.dto';

/**
 * Relecture des transcriptions d'épreuves par l'administration.
 *
 * Kessiah transcrit les épreuves scannées automatiquement, mais une lecture
 * automatique n'est pas une lecture sûre : tant qu'aucun humain ne l'a relue,
 * l'assistante s'interdit d'affirmer une correction sur cette base. Ces routes
 * donnent au back-office de quoi lever cette réserve — ou rejeter une
 * transcription inexploitable.
 *
 * Le moment est choisi : l'admin regarde déjà le document pour approuver la
 * soumission. Valider la transcription au même instant ne lui coûte rien de
 * plus, alors qu'une relecture différée n'aurait jamais lieu.
 */
@ApiTags('kessiah')
@Controller('kessiah/epreuves')
export class KessiahController {
    constructor(private readonly kessiah: KessiahService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @Get(':id/transcription')
    @ApiOperation({
        summary:
            "Transcription d'une épreuve, à relire en regard du document. 404 si Kessiah n'a pas encore lu l'épreuve.",
    })
    @ApiResponse({ status: 200, description: 'Texte, découpage en exercices, état et confiance' })
    async getTranscription(@Param('id', ParseIntPipe) id: number) {
        const transcription = await this.kessiah.getTranscription(id);
        if (!transcription) {
            throw new NotFoundException(
                `Aucune transcription pour l'épreuve #${id} : elle n'a pas encore été lue.`,
            );
        }
        return transcription;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @Get('submissions/:uuid/transcription')
    @ApiOperation({
        summary:
            "Transcription d'une soumission encore en attente, pour la valider en même temps que le document.",
    })
    async getSubmissionTranscription(@Param('uuid') uuid: string) {
        const transcription = await this.kessiah.getTranscription(kessiahStagingKey(uuid));
        if (!transcription) {
            throw new NotFoundException(
                `Aucune transcription pour la soumission ${uuid} : sa lecture n'est pas encore terminée.`,
            );
        }
        return transcription;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @Patch('submissions/:uuid/transcription')
    @ApiOperation({
        summary:
            'Valider ou rejeter la transcription d\'une soumission. Le verdict suit l\'épreuve à son approbation.',
    })
    async reviewSubmissionTranscription(
        @Param('uuid') uuid: string,
        @Body() dto: ReviewTranscriptionDto,
    ) {
        return this.kessiah.reviewTranscription(kessiahStagingKey(uuid), {
            statut: dto.statut,
            texte: dto.texte,
        });
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @Patch(':id/transcription')
    @ApiOperation({
        summary:
            "Valider ou rejeter une transcription. Le texte peut être corrigé au passage plutôt que rejeté en bloc.",
    })
    @ApiResponse({ status: 200, description: 'Nouvel état et découpage recalculé' })
    async reviewTranscription(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ReviewTranscriptionDto,
    ) {
        return this.kessiah.reviewTranscription(id, {
            statut: dto.statut,
            texte: dto.texte,
        });
    }
}
