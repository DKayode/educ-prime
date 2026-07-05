import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class SoumettreAnswerDto {
  @ApiProperty()
  @IsUUID()
  question_id: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  rating?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  texte?: string;
}

export class SoumettreReponseDto {
  @ApiProperty({ type: [SoumettreAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoumettreAnswerDto)
  answers: SoumettreAnswerDto[];
}
