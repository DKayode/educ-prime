import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class ProlongerAbonnementDto {
  @ApiProperty({ example: 15, description: 'Jours à ajouter à la date de fin' })
  @IsInt()
  @Min(1, { message: 'La prolongation doit être d’au moins 1 jour' })
  jours: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  motif?: string;
}
