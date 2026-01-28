import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCommentaireDto {
    @ApiProperty({ description: 'ID du parcours' })
    @IsNotEmpty()
    @IsInt()
    @Type(() => Number)
    parcours_id: number;

    @ApiProperty({ description: 'Contenu du commentaire' })
    @IsNotEmpty()
    contenu: string;

    @ApiProperty({ description: 'ID du commentaire parent', required: false })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    parent_id?: number;
}

export class PaginationDto {
    @ApiProperty({
        description: 'Numéro de page',
        required: false,
        default: 1,
        example: 1
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiProperty({
        description: 'Nombre d\'éléments par page',
        required: false,
        default: 10,
        example: 10
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;
}

export class CommentaireQueryDto extends PaginationDto {
    @ApiProperty({
        description: 'ID du parcours',
        required: false,
        example: 1
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    parcours_id?: number;

    @ApiProperty({
        description: 'ID de l\'utilisateur',
        required: false,
        example: 1
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    utilisateur_id?: number;

    @ApiProperty({
        description: 'ID du commentaire parent (null pour les commentaires racine)',
        required: false,
        nullable: true,
        example: null
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    parent_id?: number | null;

    @ApiProperty({
        description: 'Date du commentaire (format YYYY-MM-DD)',
        required: false,
        example: '2024-01-15'
    })
    @IsOptional()
    @IsString()
    date_commentaire?: string;

    @ApiProperty({
        description: 'Inclure les réponses (enfants) des commentaires',
        required: false,
        default: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    includeChildren?: boolean = false;

    @ApiProperty({
        description: 'Inclure le compte des dislikes',
        required: false,
        default: false,
        example: false
    })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    includeDislikesCount?: boolean = false;

    @ApiProperty({
        description: 'Ordre de tri pour les enfants',
        required: false,
        default: 'ASC',
        enum: ['ASC', 'DESC'],
        example: 'ASC'
    })
    @IsOptional()
    @IsString()
    childrenOrder?: 'ASC' | 'DESC' = 'ASC';

    @ApiProperty({
        description: 'Champ de tri principal',
        required: false,
        default: 'date_commentaire',
        enum: ['id', 'date_commentaire', 'contenu'],
        example: 'date_commentaire'
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'date_commentaire';

    @ApiProperty({
        description: 'Ordre de tri principal',
        required: false,
        default: 'DESC',
        enum: ['ASC', 'DESC'],
        example: 'DESC'
    })
    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';

    @ApiProperty({
        description: 'Inclure tous les commentaires (sans pagination)',
        required: false,
        default: false,
        example: false
    })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    includeAllComments?: boolean = false;

    @ApiProperty({
        description: 'Recherche dans le contenu du commentaire',
        required: false,
        example: 'super'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        description: 'Filtrer par utilisateur ayant liké',
        required: false,
        example: 2
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    liked_by_user_id?: number;

    @ApiProperty({
        description: 'Trier par nombre de likes',
        required: false,
        default: false,
        example: false
    })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    sortByLikes?: boolean = false;
}