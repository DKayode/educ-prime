import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Type } from '../../types/entities/type.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

@Entity('services')
export class Service {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 255 })
    titre: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'varchar', length: 255 })
    localisation: string;

    @Column({ name: 'utilisateur_id' })
    utilisateur_id: number;

    @Column({ name: 'tarif', type: 'decimal', precision: 10, scale: 2, nullable: true })
    prix: number;

    @Column({ name: 'type_id' })
    type_id: number;

    @Column({ type: 'enum', enum: ServiceStatusEnum, default: ServiceStatusEnum.PENDING_APPROVAL })
    status: ServiceStatusEnum;

    @Column({ name: 'disponibilite', type: 'int', nullable: true })
    delai: number;

    @Column({ type: 'text', nullable: true })
    livrable: string;

    @Column({ nullable: true })
    image_couverture: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @ManyToOne(() => Type, type => type.services)
    @JoinColumn({ name: 'type_id' })
    type: Type;

    @ManyToOne(() => Utilisateur, utilisateur => utilisateur.services)
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;
}
