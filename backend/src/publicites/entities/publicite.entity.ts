import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('publicites')
export class Publicite {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    titre: string;

    @Column({ type: 'text', nullable: true })
    image_video: string;

    @Column({ type: 'text', nullable: true })
    lien: string;

    @Column({ default: 0 })
    ordre: number;

    @Column({ default: true })
    actif: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    date_creation: Date;
}
