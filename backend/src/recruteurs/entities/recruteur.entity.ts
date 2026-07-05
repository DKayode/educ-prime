import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

@Entity('recruteurs')
export class Recruteur {
    @PrimaryGeneratedColumn()
    id: number;

    // External identifier the R2 /files pipeline resolves rows by. Mirrors the
    // sibling `prestataires` — recruteurs were skipped in the original uuid
    // migration (no photos existed then), added in edukia-db migration 060.
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    // Public R2 profile-photo slot (full anonymous URL in _path). Legacy
    // Firebase URL is mirrored to `photo_profil` by the dual-write bridge.
    @Column({ type: 'text', default: '' })
    profil_photo_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    profil_photo_extension: string;

    @Column({ type: "varchar", length: 50, default: "benin" })
    pays: string;
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
