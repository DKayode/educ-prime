import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreerEtablissementDto {
  @ApiProperty({ example: 'Université de Lomé', description: 'Nom de l\'établissement' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Lomé', description: 'Ville de l\'établissement', required: false })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiProperty({ example: '00228', description: 'Code postal', required: false })
  @IsOptional()
  @IsString()
  code_postal?: string;

  @ApiProperty({ description: 'URL du logo', required: false })
  @IsOptional()
  @IsString()
  logo?: string;
}