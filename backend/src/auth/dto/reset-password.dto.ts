import { IsString, IsNotEmpty, MinLength, Matches, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email de l\'utilisateur' })
    @IsEmail({}, { message: 'L\'email doit être valide' })
    @IsNotEmpty({ message: 'L\'email est requis' })
    email: string;

    @ApiProperty({ example: '123456', description: 'Code de vérification reçu par email' })
    @IsString()
    @IsNotEmpty({ message: 'Le code est requis' })
    code: string;

    @ApiProperty({ example: 'NewPassword123!', description: 'Nouveau mot de passe' })
    @IsString()
    @IsNotEmpty({ message: 'Le mot de passe est requis' })
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    nouveau_mot_de_passe: string;
}
