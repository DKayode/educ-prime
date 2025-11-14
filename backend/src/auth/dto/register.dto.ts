import { IsString, IsEmail, MinLength, IsEnum } from 'class-validator';
import { RoleType, SexeType } from '../../utilisateurs/entities/utilisateur.entity';

export class RegisterDto {
    @IsString()
    nom: string;

    @IsString()
    prenom: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    mot_de_passe: string;

    @IsEnum(RoleType)
    role: RoleType;

    @IsEnum(SexeType)
    sexe: SexeType;
}