import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class KpiQueryDto {
  @ApiProperty({ example: '2025-01-01', description: 'Début de la période (inclus)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31', description: 'Fin de la période (inclus)' })
  @IsDateString()
  endDate: string;
}
