import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum ConcoursExamenType {
    CONCOURS = 'Concours',
    EXAMENS = 'Examens',
}

@Entity('concours_examens')
export class ConcoursExamen {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    titre: string;

    @Column({ type: 'varchar', length: 50 })
    type: ConcoursExamenType;

    @Column({ nullable: true })
    pays: string;

    @Column({ nullable: true })
    niveau: string;

    @Column({ type: 'date', nullable: true })
    date: Date;

    @Column({ nullable: true })
    lieu: string;

    @Column({ type: 'text', nullable: true })
    image: string;

    @Column({ type: 'text', nullable: true })
    rubriques: string;

    @Column({ type: 'text', nullable: true })
    fichiers_telechargeables: string;

    @Column({ default: true })
    actif: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    date_creation: Date;
}
