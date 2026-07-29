import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// Admin edit of a PENDING concours submission: bind a real structure/titre id
// (clears the proposed name) or overwrite the proposed name; année/lieu editable.
// All optional — only provided fields change.
export class UpdateConcoursSubmissionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  structure_id?: number;

  @ApiProperty({ required: false, description: 'Nom de structure proposé (si pas d\'id)' })
  @IsOptional()
  @IsString()
  proposed_structure?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  titre_id?: number;

  @ApiProperty({ required: false, description: 'Nom de titre proposé (si pas d\'id)' })
  @IsOptional()
  @IsString()
  proposed_titre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  annee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lieu?: string;
}
