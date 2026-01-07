import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreerMatiereDto {
  @ApiProperty({ example: 'Mathématiques', description: 'Nom de la matière' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Cours de base', description: 'Description de la matière', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: 'ID du niveau d\'étude' })
  @IsNumber()
  niveau_etude_id: number;

  @ApiProperty({ example: 1, description: 'ID de la filière' })
  @IsNumber()
  filiere_id: number;
}