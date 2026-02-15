import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateForumDto {
    @ApiProperty({ description: 'Theme of the forum discussion' })
    @IsString()
    @IsNotEmpty()
    theme: string;

    @ApiProperty({ description: 'Content of the forum post' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty({ description: 'URL of the photo', required: false })
    @IsString()
    @IsOptional()
    photo?: string;


}
