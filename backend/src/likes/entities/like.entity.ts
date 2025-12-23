import { ApiProperty } from '@nestjs/swagger';
import { Commentaire } from 'src/commentaires/entities/commentaire.entity';
import { Parcour } from 'src/parcours/entities/parcour.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('likes')
@Unique(['parcours_id', 'utilisateur_id'])
@Unique(['commentaire_id', 'utilisateur_id'])
export class Like {
    @ApiProperty({ description: 'ID unique du like' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'ID du parcours', nullable: true })
    @Column({ name: 'parcours_id', type: 'integer', nullable: true })
    parcours_id: number;

    @ApiProperty({ description: 'ID du commentaire', nullable: true })
    @Column({ name: 'commentaire_id', type: 'integer', nullable: true })
    commentaire_id: number;

    @ApiProperty({ description: 'ID de l\'utilisateur' })
    @Column({ name: 'utilisateur_id', type: 'integer' })
    utilisateur_id: number;

    @ApiProperty({ description: 'Date du like' })
    @CreateDateColumn({ name: 'date_like' })
    date_like: Date;

    @ApiProperty({ description: 'Date du dislike', nullable: true })
    @Column({ name: 'date_dislike', type: 'timestamp', nullable: true })
    date_dislike: Date;

    @ApiProperty({ description: 'Type de réaction' })
    @Column({ type: 'enum', enum: ['like', 'dislike'], default: 'like' })
    type: 'like' | 'dislike';

    // Relations
    @ManyToOne(() => Parcour, parcours => parcours.likes, { nullable: true })
    @JoinColumn({ name: 'parcours_id' })
    parcours: Parcour;

    @ManyToOne(() => Commentaire, commentaire => commentaire.likes, { nullable: true })
    @JoinColumn({ name: 'commentaire_id' })
    commentaire: Commentaire;
}