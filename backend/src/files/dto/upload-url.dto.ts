import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlRequestDto {
    @ApiProperty({ description: 'File extension (without leading dot)', example: 'png' })
    @IsString()
    @IsNotEmpty()
    extension: string;
}
