import { IsOptional, IsString } from 'class-validator';

export class RembourserPaiementDto {
  @IsOptional()
  @IsString()
  motif?: string;
}

