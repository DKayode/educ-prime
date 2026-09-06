import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrigineCode } from '../entities/code.entity';
import { Effet } from '../entities/code-effet.entity';

export class FilterCodesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OrigineCode, description: 'Sans filtre, seuls les codes créés au back-office sont listés.' })
  @IsOptional()
  @IsEnum(OrigineCode)
  origine?: OrigineCode;

  @ApiPropertyOptional({ enum: Effet, description: 'Ne garde que les codes portant cet effet.' })
  @IsOptional()
  @IsEnum(Effet)
  effet?: Effet;

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
