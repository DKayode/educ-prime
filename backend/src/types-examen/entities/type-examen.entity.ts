import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('types_examen')
export class TypeExamen {
    @ApiProperty({ description: "ID unique du type d'examen" })
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @ApiProperty()
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @ApiProperty({ description: "Nom du type (BAC, CAP, BEPC, BTS…)" })
    @Column()
    nom: string;

    @ApiProperty({ required: false })
    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiProperty()
    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}
