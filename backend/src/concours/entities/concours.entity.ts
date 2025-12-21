import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('concours')
export class Concours {
    @PrimaryGeneratedColumn()
    id: number;

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
