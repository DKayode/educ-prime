import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('type_profils')
export class TypeProfil {
    @ApiProperty({ description: 'ID unique du type de profil' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'Titre du type de profil' })
    @Column({ type: 'varchar', length: 255 })
    titre: string;

    @ApiProperty({ description: 'Sous-titre du type de profil', required: false })
    @Column({ type: 'varchar', length: 255, nullable: true })
    sous_titre?: string;

    // Icône via le registre R2 FilesModule (slot public `type_profils.icone`).
    // Colonnes NULLABLE : un admin peut créer un type de profil sans icône.
    // Un slot public écrit l'URL complète directement dans icone_path.
    @ApiProperty({ description: 'Chemin/URL R2 de l\'icône (slot public type_profils.icone)', required: false })
    @Column({ type: 'varchar', nullable: true })
    icone_path?: string;

    @ApiProperty({ description: 'Extension de l\'icône', required: false })
    @Column({ type: 'varchar', nullable: true })
    icone_extension?: string;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @ApiProperty({ description: 'Date de création' })
    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}
