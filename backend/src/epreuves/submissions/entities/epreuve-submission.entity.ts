import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceStatusEnum } from '../../../common/enums/service-status.enum';
import { Etablissement } from '../../../etablissements/entities/etablissement.entity';
import { Filiere } from '../../../filieres/entities/filiere.entity';
import { NiveauEtude } from '../../../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../../../matieres/entities/matiere.entity';
import { Utilisateur } from '../../../utilisateurs/entities/utilisateur.entity';

// Staging row for a user-submitted épreuve (migration 011). Each parent level is
// EITHER an existing id (FK, ON DELETE SET NULL) OR a proposed_* name the admin
// resolves at approval. Relations are optional (createForeignKeyConstraints:false
// — the FKs are owned by the SQL migration, not synchronize).
@Entity('epreuve_submissions')
export class EpreuveSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'int', nullable: true })
  etablissement_id: number | null;

  @Column({ type: 'text', nullable: true })
  proposed_etablissement: string | null;

  @Column({ type: 'int', nullable: true })
  filiere_id: number | null;

  @Column({ type: 'text', nullable: true })
  proposed_filiere: string | null;

  @Column({ type: 'int', nullable: true })
  niveau_etude_id: number | null;

  @Column({ type: 'text', nullable: true })
  proposed_niveau: string | null;

  @Column({ type: 'int', nullable: true })
  matiere_id: number | null;

  @Column({ type: 'text', nullable: true })
  proposed_matiere: string | null;

  @Column({ type: 'text' })
  titre: string;

  @Column({ type: 'int', nullable: true })
  annee: number | null;

  @Column({ type: 'varchar', length: 50, default: 'normal' })
  section: string;

  @Column({ type: 'text', default: '' })
  file_path: string;

  @Column({ type: 'varchar', length: 10, default: '' })
  file_extension: string;

  @Column({ type: 'text', default: '' })
  url: string;

  @Column({ type: 'int', nullable: true })
  soumis_par_id: number | null;

  @Column({ type: 'varchar', length: 20, default: ServiceStatusEnum.PENDING_APPROVAL })
  status: ServiceStatusEnum;

  // Admin's explanation when the submission is declined (migration 066).
  @Column({ type: 'text', nullable: true })
  decline_reason: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  date_creation: Date;

  @ManyToOne(() => Etablissement, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement?: Etablissement;

  @ManyToOne(() => Filiere, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'filiere_id' })
  filiere?: Filiere;

  @ManyToOne(() => NiveauEtude, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'niveau_etude_id' })
  niveau_etude?: NiveauEtude;

  @ManyToOne(() => Matiere, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'matiere_id' })
  matiere?: Matiere;

  @ManyToOne(() => Utilisateur, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'soumis_par_id' })
  soumis_par?: Utilisateur;
}
