import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TypeExamen } from '../../types-examen/entities/type-examen.entity';

@Entity('filieres_examen')
export class FiliereExamen {
    @ApiProperty({ description: 'ID unique de la filière' })
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @ApiProperty()
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @ApiProperty({ description: "Type d'examen parent (scope)" })
    @Column({ name: 'type_examen_id' })
    type_examen_id: number;

    @ApiProperty({ type: () => TypeExamen })
    @ManyToOne(() => TypeExamen, { nullable: false })
    @JoinColumn({ name: 'type_examen_id' })
    type_examen: TypeExamen;

    @ApiProperty({ description: 'Nom de la filière (Droit, Économie, Génie Civil…)' })
    @Column()
    nom: string;

    @ApiProperty({ required: false })
    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}
