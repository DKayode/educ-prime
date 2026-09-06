import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ValiderCodeDto {
  @ApiProperty({ example: 'RENTREE2026' })
  @IsString()
  @IsNotEmpty({ message: 'Le code est requis' })
  @Length(3, 50)
  code: string;

  @ApiPropertyOptional({ description: 'Plan visé — permet de calculer la remise et de vérifier l’éligibilité.' })
  @IsOptional()
  @IsUUID('4', { message: 'plan_uuid doit être un UUID' })
  plan_uuid?: string;
}
