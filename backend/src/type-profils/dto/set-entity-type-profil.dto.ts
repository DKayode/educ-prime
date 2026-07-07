import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { TAGGABLE_ENTITIES } from '../taggable-entities';

export class SetEntityTypeProfilDto {
  @ApiProperty({ enum: TAGGABLE_ENTITIES, description: 'Entité de contenu à associer' })
  @IsIn(TAGGABLE_ENTITIES as unknown as string[])
  entity: string;

  @ApiProperty({ required: false, nullable: true, description: 'Type de profil (null pour dissocier)' })
  @IsOptional()
  @IsInt()
  type_profil_id?: number | null;
}
