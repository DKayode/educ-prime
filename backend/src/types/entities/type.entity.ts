import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Service } from '../../services/entities/service.entity';
import { Offre } from '../../offres/entities/offre.entity';
import { EntiteType } from '../../common/enums/entite-type.enum';

export { EntiteType };

@Entity('types')
export class Type {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 255 })
    nom: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: EntiteType, default: EntiteType.SERVICES })
    entite_type: EntiteType;

    @OneToMany(() => Service, service => service.type)
    services: Service[];

    @OneToMany(() => Offre, offre => offre.type)
    offres: Offre[];
}
