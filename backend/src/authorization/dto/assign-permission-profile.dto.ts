import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class AssignPermissionProfileDto {
  @Type(() => Number)
  @IsInt()
  profileId: number;
}