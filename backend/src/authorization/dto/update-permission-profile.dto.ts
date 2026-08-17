import { PartialType } from '@nestjs/swagger';
import { CreatePermissionProfileDto } from './create-permission-profile.dto';

export class UpdatePermissionProfileDto extends PartialType(CreatePermissionProfileDto) {}