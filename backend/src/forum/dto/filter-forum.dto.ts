import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterForumDto extends PaginationDto {
    @ApiPropertyOptional({
        description: 'Trier par nombre de likes, commentaires, ou date',
        enum: ['most_liked', 'most_commented', 'date_creation'],
        default: 'date_creation'
    })
    @IsOptional()
    @IsEnum(['most_liked', 'most_commented', 'date_creation'])
    sortBy?: 'most_liked' | 'most_commented' | 'date_creation';
}
