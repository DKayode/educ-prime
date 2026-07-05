import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class CreerVilleDto {
  @ApiProperty({ example: 'Cotonou', description: 'Nom de la ville' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 1, description: 'ID du département parent (scopé au pays courant)' })
  @IsNumber()
  departement_id: number;
}
