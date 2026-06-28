import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

// Admin decision on a submitted concours. Only approve/decline are valid
// transitions here — other ServiceStatusEnum values are rejected (400).
export class UpdateConcoursStatusDto {
    @ApiProperty({
        enum: [ServiceStatusEnum.APPROVED, ServiceStatusEnum.DECLINED],
        example: ServiceStatusEnum.APPROVED,
        description: "Nouveau statut : 'approved' ou 'declined'",
    })
    @IsIn([ServiceStatusEnum.APPROVED, ServiceStatusEnum.DECLINED], {
        message: "Le statut doit être 'approved' ou 'declined'",
    })
    status: ServiceStatusEnum;
}
