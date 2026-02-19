import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('publicites')
export class Publicite {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    titre: string;

    @Column({ type: 'text', nullable: true })
    image: string;

    @Column({
        type: 'enum',
        enum: ['Image', 'Video'],
        nullable: true
    })
    type_media: 'Image' | 'Video';

    @Column({ type: 'text', nullable: true })
    media: string;

    @Column({ default: 0 })
    ordre: number;

    @Column({ default: true })
    actif: boolean;

    @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
    date_creation: Date;

    @Column({ type: 'text', nullable: true })
    lien_inscription: string;
}
