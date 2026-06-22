import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('titre')
export class Titre {
    @ApiProperty({ description: 'ID unique du titre' })
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @ApiProperty({ description: 'UUID du titre' })
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @ApiProperty({ description: 'Nom du titre' })
    @Column()
    nom: string;

    @ApiProperty({ description: 'Description du titre', required: false })
    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiProperty({ description: 'Date de création' })
    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @ApiProperty({ description: 'Date de mise à jour' })
    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
