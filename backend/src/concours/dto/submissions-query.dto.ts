import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Query for the admin submissions list. Extends pagination with an optional
// status filter so the global forbidNonWhitelisted ValidationPipe accepts
// `?status=` instead of rejecting it as an unknown property.
export class SubmissionsQueryDto extends PaginationDto {
    @IsOptional()
    @IsString()
    status?: string;
}
