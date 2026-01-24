import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class MarkNotificationAsReadDto {
    @ApiProperty({ description: 'ID de la notification' })
    @Transform(({ value }) => parseInt(value, 10))
    @IsNumber()
    notificationId: number;

    @ApiProperty({
        description: 'Marquer comme lu (true) ou non lu (false)',
        default: true,
        required: false
    })
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    @IsOptional()
    markAsRead?: boolean = true;
}