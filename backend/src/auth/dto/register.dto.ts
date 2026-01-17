import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';
import { RoleType, SexeType } from '../../utilisateurs/entities/utilisateur.entity';

export class RegisterDto {
    @ApiProperty({ example: 'Doe', description: 'Le nom de l\'utilisateur' })
    @IsString()
    nom: string;

    @ApiProperty({ example: 'John', description: 'Le prénom de l\'utilisateur' })
    @IsString()
    prenom: string;

    @ApiProperty({ example: 'johndoe', description: 'Le pseudo de l\'utilisateur', required: false })
    @IsOptional()
    @IsString()
    pseudo?: string;


    @ApiProperty({ example: 'john.doe@example.com', description: 'L\'adresse email de l\'utilisateur' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', description: 'Le mot de passe de l\'utilisateur (min 6 caractères)' })
    @IsString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    mot_de_passe: string;

    @ApiProperty({ enum: RoleType, example: RoleType.ETUDIANT, description: 'Le rôle de l\'utilisateur' })
    @IsEnum(RoleType)
    role: RoleType;

    @ApiProperty({ enum: SexeType, example: SexeType.M, description: 'Le sexe de l\'utilisateur' })
    @IsEnum(SexeType)
    sexe: SexeType;
}