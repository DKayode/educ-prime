import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('evenements')
export class Evenement {
    @PrimaryGeneratedColumn()
    id: number;



    @Column({ type: 'text', default: '' })
    image_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    image_extension: string;
    @Column({ type: "varchar", length: 50, default: "benin" })
    pays: string;
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

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
