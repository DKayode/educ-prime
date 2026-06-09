import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl, IsEnum, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';
import { OpportuniteType } from '../entities/opportunite.entity';

export class CreerOpportuniteDto {
    @ApiProperty({ example: 'Bourse d\'étude Canada', description: 'Titre de l\'opportunité' })
    @IsString()
    titre: string;

    @ApiProperty({ enum: OpportuniteType, description: 'Type d\'opportunité' })
    @IsEnum(OpportuniteType)
    type: OpportuniteType;

    @ApiProperty({ example: 'Université de Montréal', description: 'Organisme proposant l\'opportunité', required: false })
    @IsOptional()
    @IsString()
    organisme?: string;

    @ApiProperty({ example: 'Canada', description: 'Lieu de l\'opportunité', required: false })
    @IsOptional()
    @IsString()
    lieu?: string;

    @ApiProperty({ description: 'Date de publication', required: false })
    @IsOptional()
    // An empty string from an unfilled date field must collapse to undefined:
    // @IsOptional ignores undefined but not '', and @Type(() => Date) would turn
    // '' into an Invalid Date that @IsDate rejects — 400ing the whole create.
    @Transform(({ value }) =>
        value === '' || value == null ? undefined : value instanceof Date ? value : new Date(value),
    )
    @IsDate()
    date_publication?: Date;

    @ApiProperty({ description: 'URL de l\'image', required: false })
    @IsOptional()
    @IsUrl()
    image?: string;

    @ApiProperty({ description: 'Lien pour postuler', required: false })
    @IsOptional()
    @IsUrl()
    lien_postuler?: string;

    @ApiProperty({ description: 'Est actif ?', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    actif?: boolean;
}
