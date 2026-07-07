import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class CreerQuestionDto {
  @ApiProperty({ example: 'Le contenu était-il utile ?' })
  @IsString()
  libelle: string;

  @ApiProperty({ enum: ['rating', 'text'] })
  @IsIn(['rating', 'text'])
  type: 'rating' | 'text';

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  ordre?: number;
}

export class CreerSectionDto {
  @ApiProperty({ example: 'Contenu pédagogique' })
  @IsString()
  titre: string;

  @ApiProperty({ required: false, example: '📚' })
  @IsOptional()
  @IsString()
  icone?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  ordre?: number;

  @ApiProperty({ type: [CreerQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreerQuestionDto)
  questions: CreerQuestionDto[];
}

export class CreerCampaignDto {
  @ApiProperty({ example: 'Enquête de satisfaction — Juillet' })
  @IsString()
  titre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: 'app_open' })
  @IsOptional()
  @IsString()
  trigger_type?: string;

  @ApiProperty({ type: [CreerSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreerSectionDto)
  sections: CreerSectionDto[];
}
