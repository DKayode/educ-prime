import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TypeExamen } from '../../types-examen/entities/type-examen.entity';
import { Serie } from '../../series/entities/serie.entity';
import { MatiereFiliereExamen } from '../../matieres-filieres-examen/entities/matiere-filiere-examen.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

// User-submission queue for national exams. Each classifying level may be an
// existing reference id OR a free-text proposed name that the admin resolves
// into a real lookup row at approval time (mirrors concours_submissions).
@Entity('examens_nationaux_submissions')
export class ExamenNationalSubmission {
    @ApiProperty()
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty()
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    @Column({ name: 'type_examen_id', type: 'int', nullable: true })
    type_examen_id?: number | null;

    @ManyToOne(() => TypeExamen, { nullable: true })
    @JoinColumn({ name: 'type_examen_id' })
    type_examen?: TypeExamen | null;

    @Column({ name: 'proposed_type', type: 'text', nullable: true })
    proposed_type?: string | null;

    @Column({ name: 'serie_id', type: 'int', nullable: true })
    serie_id?: number | null;

    @ManyToOne(() => Serie, { nullable: true })
    @JoinColumn({ name: 'serie_id' })
    serie?: Serie | null;

    @Column({ name: 'proposed_serie', type: 'text', nullable: true })
    proposed_serie?: string | null;

    @Column({ name: 'matiere_filiere_examen_id', type: 'int', nullable: true })
    matiere_filiere_examen_id?: number | null;

    @ManyToOne(() => MatiereFiliereExamen, { nullable: true })
    @JoinColumn({ name: 'matiere_filiere_examen_id' })
    matiere_filiere_examen?: MatiereFiliereExamen | null;

    @Column({ name: 'proposed_matiere_filiere', type: 'text', nullable: true })
    proposed_matiere_filiere?: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    section?: string | null;

    @Column({ type: 'int', nullable: true })
    annee?: number | null;

    @Column({ type: 'varchar', length: 255, default: '' })
    titre: string;

    @Column({ name: 'file_path', type: 'text', default: '' })
    file_path: string;

    @Column({ name: 'file_extension', type: 'varchar', length: 10, default: '' })
    file_extension: string;

    @Column({ type: 'text', default: '' })
    url: string;

    @Column({ name: 'soumis_par_id', type: 'int', nullable: true })
    soumis_par_id?: number | null;

    @ManyToOne(() => Utilisateur, { nullable: true })
    @JoinColumn({ name: 'soumis_par_id' })
    soumis_par?: Utilisateur | null;

    @Column({ type: 'varchar', length: 20, default: 'pending_approval' })
    status: string;

    @Column({ name: 'decline_reason', type: 'text', nullable: true })
    decline_reason?: string | null;

    @ApiProperty()
    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}
