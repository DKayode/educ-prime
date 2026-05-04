import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { Type } from '../../types/entities/type.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { Competence } from '../../competences/entities/competence.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';

export { ServiceStatusEnum };

@Entity('offres')
export class Offre {
    @PrimaryGeneratedColumn()
    id: number;


    @Column({ type: "varchar", length: 50, default: "benin" })
    pays: string;
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 255 })
    titre: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ name: 'type_id' })
    type_id: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    prix: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    temps: string;

    @Column({ nullable: true })
    image_couverture: string;

    @Column({ name: 'utilisateur_id' })
    utilisateur_id: number;

    @Column({ type: 'enum', enum: ServiceStatusEnum, default: ServiceStatusEnum.PENDING_APPROVAL })
    status: ServiceStatusEnum;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @ManyToOne(() => Type, type => type.offres)
    @JoinColumn({ name: 'type_id' })
    type: Type;

    @ManyToOne(() => Utilisateur, utilisateur => utilisateur.offres)
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;

    @ManyToMany(() => Competence, competence => competence.offres)
    @JoinTable({
        name: '_competencesTooffres',
        joinColumn: { name: 'B', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'A', referencedColumnName: 'id' }
    })
    competences: Competence[];
}
