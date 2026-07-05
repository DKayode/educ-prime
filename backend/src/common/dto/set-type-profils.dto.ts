import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt } from 'class-validator';

/**
 * Payload partagé pour PUT /<entity>/:id/type-profils — remplace intégralement
 * (replace-set) la checklist de types de profil taguée sur la ligne.
 */
export class SetTypeProfilsDto {
    @ApiProperty({ type: [Number], description: 'IDs des types de profil (remplacement complet)' })
    @IsArray()
    @IsInt({ each: true })
    @ArrayUnique()
    typeProfilIds: number[];
}
