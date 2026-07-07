import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional } from 'class-validator';
import { TAGGABLE_ENTITIES } from '../taggable-entities';

export class SetEntityTypeProfilDto {
  @ApiProperty({ enum: TAGGABLE_ENTITIES, description: 'Entité de contenu à associer' })
  @IsIn(TAGGABLE_ENTITIES as unknown as string[])
  entity: string;

  @ApiProperty({
    type: [Number],
    required: false,
    description: 'Liste complète des types de profil (remplace la sélection ; [] pour dissocier)',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  type_profil_ids?: number[];
}
