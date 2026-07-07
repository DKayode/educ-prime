import { IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterCampaignDto extends PaginationDto {
  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  statut?: 'draft' | 'active' | 'archived';
}
