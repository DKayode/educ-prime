import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class DeclinerSubmissionDto {
  // Optional free-text reason. Logged for the admin trail; there is no column to
  // persist it and the shared mail template takes no reason, so it isn't stored.
  @ApiProperty({ required: false, description: "Motif du refus (optionnel)" })
  @IsOptional()
  @IsString()
  reason?: string;
}
