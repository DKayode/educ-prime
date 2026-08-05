import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TypeExamen } from '../../types-examen/entities/type-examen.entity';
import { Serie } from '../../series/entities/serie.entity';
import { MatiereExamen } from '../../matieres-examen/entities/matiere-examen.entity';
import { FiliereExamen } from '../../filieres-examen/entities/filiere-examen.entity';

@Entity('examens_nationaux')
export class ExamenNational {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @ApiProperty({ description: "Type d'examen (BAC, CAP, Licence…)" })
    @Column({ name: 'type_examen_id' })
    type_examen_id: number;

    @ApiProperty({ type: () => TypeExamen })
    @ManyToOne(() => TypeExamen, { nullable: false })
    @JoinColumn({ name: 'type_examen_id' })
    type_examen: TypeExamen;

    @ApiProperty({ description: 'Série (optionnelle)', required: false })
    @Column({ name: 'serie_id', nullable: true })
    serie_id?: number;

    @ApiProperty({ type: () => Serie, required: false })
    @ManyToOne(() => Serie, { nullable: true })
    @JoinColumn({ name: 'serie_id' })
    serie?: Serie;

    // Matière et filière sont INDÉPENDANTES et OPTIONNELLES, mais au moins l'une
    // des deux doit être renseignée (BAC → matière ; Licence → filière + matière).
    @ApiProperty({ description: 'Matière (optionnelle)', required: false })
    @Column({ name: 'matiere_examen_id', nullable: true })
    matiere_examen_id?: number;

    @ApiProperty({ type: () => MatiereExamen, required: false })
    @ManyToOne(() => MatiereExamen, { nullable: true })
    @JoinColumn({ name: 'matiere_examen_id' })
    matiere_examen?: MatiereExamen;

    @ApiProperty({ description: 'Filière (optionnelle)', required: false })
    @Column({ name: 'filiere_examen_id', nullable: true })
    filiere_examen_id?: number;

    @ApiProperty({ type: () => FiliereExamen, required: false })
    @ManyToOne(() => FiliereExamen, { nullable: true })
    @JoinColumn({ name: 'filiere_examen_id' })
    filiere_examen?: FiliereExamen;

    @ApiProperty({ description: 'Section (Normal, Remplacement…)', required: false })
    @Column({ type: 'varchar', length: 30, nullable: true })
    section?: string;

    @ApiProperty({ description: "Année de l'examen" })
    @Column({ type: 'int' })
    annee: number;

    @ApiProperty({ description: 'Intitulé composé côté serveur' })
    @Column({ type: 'varchar', length: 255, default: '' })
    titre: string;

    @Column({ name: 'file_path', type: 'text', default: '' })
    file_path: string;

    @Column({ name: 'file_extension', type: 'varchar', length: 10, default: '' })
    file_extension: string;

    /** Legacy Firebase URL (transitional mirror). */
    @Column({ type: 'text', default: '' })
    url: string;

    @ApiProperty()
    @Column({ name: 'nombre_pages', type: 'int', default: 0 })
    nombre_pages: number;

    @ApiProperty()
    @Column({ name: 'nombre_telechargements', type: 'int', default: 0 })
    nombre_telechargements: number;

    @ApiProperty()
    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}
