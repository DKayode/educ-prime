import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum OpportuniteType {
    BOURSES = 'Bourses',
    STAGES = 'Stages',
}

@Entity('opportunites')
export class Opportunite {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column()
    titre: string;

    @Column({ type: 'varchar', length: 50 })
    type: OpportuniteType;

    @Column({ nullable: true })
    organisme: string;

    @Column({ nullable: true })
    lieu: string;

    @Column({ type: 'date', nullable: true })
    date_publication: Date;

    @Column({ type: 'text', nullable: true })
    image: string;

    @Column({ type: 'text', nullable: true })
    lien_postuler: string;

    @Column({ default: true })
    actif: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    date_creation: Date;
}
