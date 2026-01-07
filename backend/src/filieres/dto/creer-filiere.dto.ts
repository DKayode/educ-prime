import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class CreerFiliereDto {
  @ApiProperty({ example: 'Génie Logiciel', description: 'Nom de la filière' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 1, description: 'ID de l\'établissement' })
  @IsNumber()
  etablissement_id: number;
}