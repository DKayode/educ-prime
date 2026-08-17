import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewTranscriptionDto {
    @ApiProperty({
        enum: ['valide', 'rejete'],
        description:
            "Verdict de l'admin. `valide` autorise Kessiah à s'appuyer sur le texte " +
            "pour corriger ; `rejete` rend l'épreuve muette pour l'assistante, sans " +
            'effacer le texte, qui reste consultable pour diagnostic.',
    })
    @IsIn(['valide', 'rejete'])
    statut: 'valide' | 'rejete';

    @ApiPropertyOptional({
        description:
            'Transcription corrigée. Permet de réparer une coquille plutôt que de ' +
            "rejeter en bloc : l'admin a le document sous les yeux. Le texte relu " +
            'fait alors foi et le découpage en exercices est recalculé dessus.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(200_000)
    texte?: string;
}
