import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectWithdrawalDto {
  @ApiProperty({ example: 'Informations Mobile Money incorrectes' })
  @IsString()
  @MinLength(5)
  reason: string;
}
