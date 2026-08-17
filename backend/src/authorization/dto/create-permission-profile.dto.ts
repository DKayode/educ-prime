import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Permission } from '../../auth/permissions/permission.enum';

export class CreatePermissionProfileDto {
  @IsString()
  @MaxLength(80)
  code: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_system?: boolean;

  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}