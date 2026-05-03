import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Prestataire } from '../../prestataires/entities/prestataire.entity';
import { Offre } from '../../offres/entities/offre.entity';

@Entity('competences')
export class Competence {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 100 })
    nom: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @ManyToMany(() => Prestataire, prestataire => prestataire.competences)
    prestataires: Prestataire[];

    @ManyToMany(() => Offre, offre => offre.competences)
    offres: Offre[];
}
