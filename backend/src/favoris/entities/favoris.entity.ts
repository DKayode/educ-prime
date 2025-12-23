import { ApiProperty } from '@nestjs/swagger';
import { Parcour } from 'src/parcours/entities/parcour.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('favoris')
@Unique(['parcours_id', 'utilisateur_id'])
export class Favori {
    @ApiProperty({ description: 'ID unique du favori' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'ID du parcours' })
    @Column({ name: 'parcours_id', type: 'integer' })
    parcours_id: number;

    @ApiProperty({ description: 'ID de l\'utilisateur' })
    @Column({ name: 'utilisateur_id', type: 'integer' })
    utilisateur_id: number;

    @ApiProperty({ description: 'Date d\'ajout aux favoris' })
    @CreateDateColumn({ name: 'date_favoris' })
    date_favoris: Date;

    // Relations
    @ManyToOne(() => Parcour, parcours => parcours.favoris, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parcours_id' })
    parcours: Parcour;
}