import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AppareilType } from '../entities/refresh-token.entity';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Le refresh token' })
  @IsString()
  refresh_token: string;
}

export class LoginWithDeviceDto {
  @ApiProperty({ example: 'user@example.com', description: 'L\'adresse email de l\'utilisateur' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Le mot de passe de l\'utilisateur' })
  @IsString()
  mot_de_passe: string;

  @ApiProperty({ enum: AppareilType, required: false, description: 'Le type d\'appareil utilisé' })
  @IsOptional()
  @IsEnum(AppareilType)
  appareil?: AppareilType;
}
