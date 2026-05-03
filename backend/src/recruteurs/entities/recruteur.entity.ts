import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

@Entity('recruteurs')
export class Recruteur {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    numero_ifu: string;

    @Column({ type: 'varchar', length: 100 })
    nom: string;

    @Column({ type: 'varchar', length: 100 })
    nom_recruteur: string;

    @Column({ type: 'varchar', length: 100 })
    prenom: string;

    @Column({ name: 'utilisateur_id', unique: true })
    utilisateur_id: number;

    @Column({ nullable: true })
    photo_profil: string;

    @Column({ nullable: true })
    photo_identite: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    adresse: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    telephone: string;

    @Column({ type: 'text', nullable: true })
    biographie: string;

    @Column({ type: 'enum', enum: ServiceStatusEnum, default: ServiceStatusEnum.PENDING_APPROVAL })
    status: ServiceStatusEnum;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @OneToOne(() => Utilisateur, utilisateur => utilisateur.recruteur, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;
}
