import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsEnum, IsOptional, IsDateString, IsIn } from 'class-validator';
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

    @ApiProperty({ example: 'CODE123', description: 'Code de parrainage', required: false })
    @IsOptional()
    @IsString()
    code_parrainage?: string;

    @ApiProperty({ example: '1995-04-23', description: 'Date de naissance (PII optionnelle, consentement)', required: false })
    @IsOptional()
    @IsDateString()
    date_naissance?: string;

    @ApiProperty({ example: '25-34', description: "Tranche d'âge (remplace date_naissance)", required: false })
    @IsOptional()
    @IsString()
    age_group?: string;

    @ApiProperty({ enum: ['rural', 'urbain'], description: 'Zone de résidence (PII optionnelle)', required: false })
    @IsOptional()
    @IsIn(['rural', 'urbain'])
    zone_residence?: string;

    @ApiProperty({ enum: ['visuel', 'auditif', 'moteur', 'psychomoteur', 'aucun'], description: 'Situation de handicap (PII optionnelle)', required: false })
    @IsOptional()
    @IsIn(['visuel', 'auditif', 'moteur', 'psychomoteur', 'aucun'])
    situation_handicap?: string;
}