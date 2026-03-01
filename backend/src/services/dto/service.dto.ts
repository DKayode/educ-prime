import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { services_status_enum } from '@prisma/client';

export class CreateServiceDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    titre: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    localisation: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    tarif?: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    type_id: number;

    @ApiPropertyOptional({ type: 'object' })
    @IsObject()
    @IsOptional()
    disponibilite?: any;
}

export class UpdateServiceDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    titre?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    localisation?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    tarif?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    type_id?: number;

    @ApiPropertyOptional({ enum: services_status_enum })
    @IsEnum(services_status_enum)
    @IsOptional()
    status?: services_status_enum;

    @ApiPropertyOptional({ type: 'object' })
    @IsObject()
    @IsOptional()
    disponibilite?: any;
}

export class UpdateServiceStatusDto {
    @ApiProperty({ enum: services_status_enum })
    @IsEnum(services_status_enum)
    @IsNotEmpty()
    status: services_status_enum;
}
