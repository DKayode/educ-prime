import { ApiProperty } from '@nestjs/swagger';
import { Parcour } from 'src/parcours/entities/parcour.entity';
import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity('categories')
export class Category {
    @ApiProperty({ description: 'ID unique de la catégorie' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'Nom de la catégorie' })
    @Column({ unique: true })
    nom: string;

    @ApiProperty({ description: 'Slug de la catégorie (pour les URLs)' })
    @Column({ unique: true })
    slug: string;

    @ApiProperty({ description: 'Description de la catégorie', required: false })
    @Column({ type: 'text', nullable: true })
    description?: string;

    @ApiProperty({ description: 'Icône de la catégorie', required: false })
    @Column({ nullable: true })
    icone?: string;

    @ApiProperty({ description: 'Est-ce que la catégorie est active ?' })
    @Column({ default: true })
    is_active: boolean;

    @ApiProperty({ description: 'Ordre d\'affichage' })
    @Column({ default: 0 })
    ordre: number;

    @ApiProperty({ description: 'Date de création' })
    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;

    @ApiProperty({ description: 'Date de mise à jour' })
    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date;

    @ApiProperty({ description: 'Parcours dans cette catégorie', type: () => [Parcour] })
    @OneToMany(() => Parcour, parcour => parcour.category)
    parcours: Parcour[];

    @ApiProperty({ description: 'Nombre de parcours dans la catégorie' })
    parcoursCount?: number;
}