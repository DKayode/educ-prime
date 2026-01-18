import { ApiProperty } from '@nestjs/swagger';
import { AppVersion } from '../entities/app-version.entity';
import { PaginationResponse } from '../../common/interfaces/pagination-response.interface';

export class AppVersionPaginationDto implements PaginationResponse<AppVersion> {
    @ApiProperty({ type: [AppVersion] })
    data: AppVersion[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
