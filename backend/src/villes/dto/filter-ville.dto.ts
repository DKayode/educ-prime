import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterVilleDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  // geo uuid: the villes list filters by the parent département's uuid
  @IsOptional()
  @IsUUID()
  departement_id?: string;
}
