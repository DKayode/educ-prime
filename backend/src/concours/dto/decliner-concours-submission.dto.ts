import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Admin's optional explanation when declining a concours submission. Persisted
// (decline_reason) and shown back to the submitter (+ included in the email).
export class DeclinerConcoursSubmissionDto {
  @ApiProperty({ required: false, description: 'Motif du refus (optionnel)' })
  @IsOptional()
  @IsString()
  reason?: string;
}
