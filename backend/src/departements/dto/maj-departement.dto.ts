import { IsString, IsOptional } from 'class-validator';

export class MajDepartementDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
