import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

@Entity('desabonnement_email')
export class DesabonnementEmail {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', unique: true })
    utilisateur_uuid: string;

    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;

    @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'utilisateur_uuid', referencedColumnName: 'uuid' })
    utilisateur: Utilisateur;
}
