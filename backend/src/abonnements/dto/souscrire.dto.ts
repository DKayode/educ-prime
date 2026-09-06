import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SouscrireDto {
  @ApiProperty({ description: 'UUID du plan choisi' })
  @IsUUID('4', { message: 'Le plan doit être identifié par un UUID' })
  @IsNotEmpty({ message: 'Le plan est requis' })
  plan_uuid: string;
}
