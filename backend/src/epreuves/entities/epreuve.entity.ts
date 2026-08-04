import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Matiere } from '../../matieres/entities/matiere.entity';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

export enum EpreuveType {
  INTERROGATION = 'Interrogation',
  DEVOIRS = 'Devoirs',
  CONCOURS = 'Concours',
  EXAMENS = 'Examens',
  EXAMEN_NATIONAL = 'Examens Nationaux',
}

export enum EpreuveSection {
  NORMAL = 'normal',
  RATTRAPAGE = 'rattrapage',
}

// Seules ces deux valeurs sont acceptées en écriture / filtre pour une épreuve.
// Utilisé par les DTO (@IsIn) et le filtre de liste : une valeur explicite hors
// de cette liste est REJETÉE (400), pas silencieusement convertie.
export const WRITABLE_EPREUVE_TYPES = [EpreuveType.EXAMENS, EpreuveType.EXAMEN_NATIONAL] as const;

// Défaut EXAMENS uniquement quand le type est ABSENT (undefined/null/vide) —
// p. ex. une soumission mobile qui n'envoie pas le champ, ou une ancienne ligne.
// Les valeurs explicites invalides sont rejetées en amont par la validation DTO,
// donc n'atteignent jamais cette fonction.
export function normalizeEpreuveType(type?: EpreuveType | string | null): EpreuveType {
  return type === EpreuveType.EXAMEN_NATIONAL ? EpreuveType.EXAMEN_NATIONAL : EpreuveType.EXAMENS;
}

@Entity('epreuves')
export class Epreuve {
  @PrimaryGeneratedColumn()
  id: number;



  @Column({ type: 'text', default: '' })
  file_path: string;

  @Column({ type: 'varchar', length: 10, default: '' })
  file_extension: string;
  @Column({ type: "varchar", length: 50, default: "benin" })
  pays: string;
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

  @Column()
  titre: string;

  @Column({ type: 'enum', enum: EpreuveType, nullable: true })
  type: EpreuveType;

  @Column({ type: 'int', nullable: true })
  annee: number;

  // DB column is varchar(20) + CHECK (not a native pg enum like `type`);
  // value space is enforced by EpreuveSection / IsEnum + the CHECK constraint.
  @Column({ type: 'varchar', length: 20, default: EpreuveSection.NORMAL })
  section: EpreuveSection;

  @Column()
  url: string;

  @Column({ nullable: true })
  duree_minutes: number;

  @Column({ type: 'int', default: 0 })
  nombre_pages: number;

  @Column({ type: 'int', default: 0 })
  nombre_telechargements: number;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  date_creation: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  date_publication: Date;

  @Column()
  professeur_id: number;

  @Column()
  matiere_id: number;

  @ManyToOne(() => Utilisateur, { nullable: false })
  @JoinColumn({ name: 'professeur_id' })
  professeur: Utilisateur;

  @ManyToOne(() => Matiere, { nullable: false })
  @JoinColumn({ name: 'matiere_id' })
  matiere: Matiere;
}