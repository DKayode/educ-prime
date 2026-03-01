import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email de l\'utilisateur' })
    @IsEmail({}, { message: 'L\'email doit être valide' })
    @IsNotEmpty({ message: 'L\'email est requis' })
    email: string;
}

export class ValidateEmailDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email de l\'utilisateur' })
    @IsEmail({}, { message: 'L\'email doit être valide' })
    @IsNotEmpty({ message: 'L\'email est requis' })
    email: string;

    @ApiProperty({ example: '123456', description: 'Code de vérification reçu par email' })
    @IsString()
    @IsNotEmpty({ message: 'Le code est requis' })
    code: string;
}
