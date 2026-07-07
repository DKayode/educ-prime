import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class MajStatutDto {
  @ApiProperty({ enum: ['draft', 'active', 'archived'] })
  @IsIn(['draft', 'active', 'archived'])
  statut: 'draft' | 'active' | 'archived';
}
