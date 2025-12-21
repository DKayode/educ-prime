import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('evenements')
export class Evenement {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    titre: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'timestamp with time zone', nullable: true })
    date: Date;

    @Column({ nullable: true })
    lieu: string;

    @Column({ type: 'text', nullable: true })
    lien_inscription: string;

    @Column({ type: 'text', nullable: true })
    image: string;

    @Column({ default: true })
    actif: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    date_creation: Date;
}
