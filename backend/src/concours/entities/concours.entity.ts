import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('concours')
export class Concours {
    @PrimaryGeneratedColumn()
    id: number;



    @Column({ type: 'text', default: '' })
    file_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    file_extension: string;
    @Column({ type: "varchar", length: 50, default: "benin" })
    pays: string;
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column()
    titre: string;

    @Column({ type: 'text', nullable: true })
    url: string;

    @Column({ nullable: true })
    annee: number;

    @Column({ nullable: true })
    lieu: string;

    @Column({ default: 0 })
    nombre_page: number;

    @Column({ default: 0 })
    nombre_telechargements: number;
}
