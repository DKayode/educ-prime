import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AppareilType } from '../entities/refresh-token.entity';

import { LoginDto } from './login.dto';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Le refresh token' })
  @IsString()
  refresh_token: string;
}

export class LoginWithDeviceDto extends LoginDto {
  @ApiProperty({ enum: AppareilType, required: false, description: 'Le type d\'appareil utilisé' })
  @IsOptional()
  @IsEnum(AppareilType)
  appareil?: AppareilType;
}
