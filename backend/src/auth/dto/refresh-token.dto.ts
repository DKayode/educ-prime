import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AppareilType } from '../entities/refresh-token.entity';

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}

export class LoginWithDeviceDto {
  @IsString()
  email: string;

  @IsString()
  mot_de_passe: string;

  @IsOptional()
  @IsEnum(AppareilType)
  appareil?: AppareilType;
}
