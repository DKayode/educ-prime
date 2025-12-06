import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('contacts_professionnels')
export class ContactsProfessionnel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nom: string;

    @Column()
    email: string;

    @Column({ nullable: true })
    telephone: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ type: 'jsonb', nullable: true })
    reseaux_sociaux: any;

    @Column({ default: true })
    actif: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    date_creation: Date;
}
