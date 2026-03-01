import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceTypeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    nom: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateServiceTypeDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    nom?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;
}
