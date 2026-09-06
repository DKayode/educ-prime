import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PeriodeReset } from '../entities/configuration-quota.entity';

export class UpdateQuotaDto {
  @ApiPropertyOptional({ example: 5, description: 'Ressources distinctes autorisées par période' })
  @IsOptional()
  @IsInt({ message: 'La limite doit être un entier' })
  @Min(0, { message: 'La limite ne peut pas être négative' })
  limite?: number;

  @ApiPropertyOptional({ enum: PeriodeReset, description: 'MENSUEL : remise à zéro le 1er du mois. AVIE : jamais.' })
  @IsOptional()
  @IsEnum(PeriodeReset, { message: 'periode_reset doit valoir MENSUEL ou AVIE' })
  periode_reset?: PeriodeReset;

  @ApiPropertyOptional({ description: 'Désactivé, le quota ne s’applique plus : la fonctionnalité redevient libre.' })
  @IsOptional()
  @IsBoolean()
  est_actif?: boolean;
}
