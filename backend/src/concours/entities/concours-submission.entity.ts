import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Structure } from '../../structure/entities/structure.entity';
import { Titre } from '../../titre/entities/titre.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

// A user-submitted concours awaiting admin resolution/approval. A submission
// may reference an EXISTING structure/titre (by id) OR PROPOSE a new one by
// name (proposed_structure / proposed_titre) when it doesn't exist yet. On
// approval the admin resolves both to real ids and a real `concours` row is
// created from this submission.
@Entity('concours_submissions')
export class ConcoursSubmission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @Column({ type: 'varchar', length: 50, default: 'benin' })
    pays: string;

    // Existing structure reference (nullable) ...
    @ApiProperty({ required: false })
    @Column({ nullable: true })
    structure_id?: number;

    @ApiProperty({ type: () => Structure, required: false })
    @ManyToOne(() => Structure, { nullable: true })
    @JoinColumn({ name: 'structure_id' })
    structure?: Structure;

    // ... or a proposed (not-yet-existing) structure name.
    @Column({ type: 'text', nullable: true })
    proposed_structure?: string;

    // Existing titre reference (nullable) ...
    @ApiProperty({ required: false })
    @Column({ nullable: true })
    titre_id?: number;

    @ApiProperty({ type: () => Titre, required: false })
    @ManyToOne(() => Titre, { nullable: true })
    @JoinColumn({ name: 'titre_id' })
    titre_ref?: Titre;

    // ... or a proposed (not-yet-existing) titre name.
    @Column({ type: 'text', nullable: true })
    proposed_titre?: string;

    @Column({ nullable: true })
    annee?: number;

    @Column({ type: 'text', nullable: true })
    lieu?: string;

    // File columns mirror concours; populated via the /files/concours_submissions
    // pipeline. `url` is the legacy Firebase mirror target.
    @Column({ type: 'text', default: '' })
    file_path: string;

    @Column({ type: 'varchar', length: 10, default: '' })
    file_extension: string;

    @Column({ type: 'text', default: '' })
    url: string;

    @Column({ nullable: true })
    soumis_par_id?: number;

    @ApiProperty({ type: () => Utilisateur, required: false })
    @ManyToOne(() => Utilisateur, { nullable: true })
    @JoinColumn({ name: 'soumis_par_id' })
    soumis_par?: Utilisateur;

    @Column({ type: 'varchar', length: 20, default: 'pending_approval' })
    status: string;

    // Admin's explanation when the submission is declined (migration 066).
    @Column({ type: 'text', nullable: true })
    decline_reason?: string | null;

    @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
    date_creation: Date;
}
