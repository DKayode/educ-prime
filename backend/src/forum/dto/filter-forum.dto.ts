import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterForumDto extends PaginationDto {
    @ApiPropertyOptional({
        description: 'Trier par nombre de likes ou commentaires',
        enum: ['most_liked', 'most_commented'],
        default: 'most_liked'
    })
    @IsOptional()
    @IsEnum(['most_liked', 'most_commented'])
    sortBy?: 'most_liked' | 'most_commented';
}
