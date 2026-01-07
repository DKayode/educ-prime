import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreerNiveauEtudeDto {
  @ApiProperty({ example: 'Licence 1', description: 'Nom du niveau d\'étude' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 12, description: 'Durée en mois', required: false })
  @IsOptional()
  @IsNumber()
  duree_mois?: number;

  @ApiProperty({ example: 1, description: 'ID de la filière' })
  @IsNumber()
  filiere_id: number;
}