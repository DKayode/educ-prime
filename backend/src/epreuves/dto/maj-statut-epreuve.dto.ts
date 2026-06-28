import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

export class MajStatutEpreuveDto {
    @ApiProperty({ description: "Nouveau statut de l'épreuve", enum: ServiceStatusEnum, example: ServiceStatusEnum.APPROVED })
    @IsEnum(ServiceStatusEnum)
    @IsNotEmpty()
    status: ServiceStatusEnum;
}
