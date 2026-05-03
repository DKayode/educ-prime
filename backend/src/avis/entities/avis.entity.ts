import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { EntiteType } from '../../common/enums/entite-type.enum';

@Entity('avis')
export class Avis {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    avisable_id: number;

    @Column({ type: 'enum', enum: EntiteType })
    avisable_type: EntiteType;

    @Column()
    utilisateur_id: number;

    @Column({ type: 'int', default: 5 })
    note: number;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @ManyToOne(() => Utilisateur, utilisateur => utilisateur.avis, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;
}
