import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TypeCode } from '../entities/code.entity';

export class FilterCodesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TypeCode, description: 'Sans filtre, les codes de parrainage sont exclus.' })
  @IsOptional()
  @IsEnum(TypeCode)
  type?: TypeCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  campagne_uuid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  est_actif?: boolean;

  @ApiPropertyOptional({ description: 'Recherche sur le code ou le libellé' })
  @IsOptional()
  @IsString()
  search?: string;
}
