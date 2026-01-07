import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEmail, IsObject } from 'class-validator';

export class CreerContactsProfessionnelDto {
    @ApiProperty({ example: 'John Doe', description: 'Nom du contact' })
    @IsString()
    nom: string;

    @ApiProperty({ example: 'contact@example.com', description: 'Email du contact' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '+22890909090', description: 'Numéro de téléphone', required: false })
    @IsOptional()
    @IsString()
    telephone?: string;

    @ApiProperty({ description: 'Message ou description', required: false })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty({ description: 'Liens vers les réseaux sociaux (JSON)', required: false })
    @IsOptional()
    @IsObject()
    reseaux_sociaux?: any;

    @ApiProperty({ description: 'Est actif ?', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
