import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

// Admin resolution: attach real parent ids to a submission that came in with
// proposed_* names (after creating those entities via the existing CRUD). Each
// provided id is validated; the matching proposed_* name is cleared.
export class ResoudreSubmissionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  etablissement_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  filiere_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  niveau_etude_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  matiere_id?: number;
}
