import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Metadata-only update (titre/description). Structure is edited via PUT (frozen
// once responses exist); statut via PATCH /:uuid/statut.
export class MajCampaignDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
