import { ApiProperty } from '@nestjs/swagger';
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('structure')
export class Structure {
    @ApiProperty({ description: 'ID unique de la structure' })
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @ApiProperty({ description: 'UUID de la structure' })
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @ApiProperty({ description: 'Nom de la structure' })
    @Column()
    nom: string;

    @ApiProperty({ description: 'Description de la structure', required: false })
    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiProperty({ description: 'Date de création' })
    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @ApiProperty({ description: 'Date de mise à jour' })
    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;
}
