import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreerDepartementDto {
  @ApiProperty({ example: 'Atlantique', description: 'Nom du département' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'AT', description: 'Code du département', required: false })
  @IsOptional()
  @IsString()
  code?: string;
}
