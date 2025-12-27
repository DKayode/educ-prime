import { ApiProperty } from '@nestjs/swagger';
import { Like } from 'src/likes/entities/like.entity';
import { Parcour } from 'src/parcours/entities/parcour.entity';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent } from 'typeorm';

@Entity('commentaires')
@Tree('closure-table')
export class Commentaire {
    @ApiProperty({ description: 'ID unique du commentaire' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'ID du parcours' })
    @Column({ name: 'parcours_id', type: 'integer' })
    parcours_id: number;

    @ApiProperty({ description: 'ID de l\'utilisateur' })
    @Column({ name: 'utilisateur_id', type: 'integer' })
    utilisateur_id: number;

    @ApiProperty({ description: 'utilisateur ayant commenté', type: () => Utilisateur, required: false })
    @ManyToOne(() => Utilisateur, utilisateur => utilisateur.commentaires, {
        eager: false,
        nullable: false,
    })
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;

    @ApiProperty({ description: 'Contenu du commentaire' })
    @Column({ type: 'text' })
    contenu: string;

    @ApiProperty({ description: 'Date du commentaire' })
    @CreateDateColumn({ name: 'date_commentaire' })
    date_commentaire: Date;

    @ApiProperty({ description: 'ID du commentaire parent', nullable: true })
    @Column({ name: 'parent_id', type: 'integer', nullable: true })
    parent_id?: number;

    // Relations
    @ManyToOne(() => Parcour, parcours => parcours.commentaires)
    @JoinColumn({ name: 'parcours_id' })
    parcours: Parcour;

    @TreeParent()
    @JoinColumn({ name: 'parent_id' })
    parent: Commentaire;

    @OneToMany(() => Like, like => like.commentaire)
    likes: Like[];

    @TreeChildren()
    enfants: Commentaire[];

    @ApiProperty({ description: 'Nombre de réponses' })
    enfantsCount?: number;
}