import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreerVilleDto {
  @ApiProperty({ example: 'Cotonou', description: 'Nom de la ville' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'a1b2c3d4-...', description: 'UUID du département parent (scopé au pays courant)' })
  @IsUUID()
  departement_id: string;
}
