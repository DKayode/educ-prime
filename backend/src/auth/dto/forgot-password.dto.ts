import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email de l\'utilisateur' })
    @IsEmail({}, { message: 'L\'email doit être valide' })
    @IsNotEmpty({ message: 'L\'email est requis' })
    email: string;
}
