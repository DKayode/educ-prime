import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'L\'adresse email de l\'utilisateur' })
    @IsEmail()
    readonly email: string;

    @ApiProperty({ example: 'password123', description: 'Le mot de passe de l\'utilisateur' })
    @IsString()
    @MinLength(8)
    readonly mot_de_passe: string;
}