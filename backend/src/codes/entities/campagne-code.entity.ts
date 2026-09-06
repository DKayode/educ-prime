import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';


/**
 * Génération en masse : « n codes uniques à usage unique pour n personnes ».
 * La campagne porte le gabarit ; chaque code généré en hérite.
 */
@Entity('campagnes_codes')
export class CampagneCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'varchar', length: 150 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  prefixe: string | null;

  @Column({ type: 'int', default: 0 })
  nombre_codes: number;

  /** Gabarit d'effets appliqué à chaque code généré — même forme que `code_effets`. */
  @Column({ type: 'jsonb', nullable: true })
  effets: Array<{ effet: string; parametres?: Record<string, any> | null }> | null;

  @Column({ type: 'timestamptz', nullable: true })
  date_debut: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  date_fin: Date | null;

  @Column({ type: 'int', nullable: true })
  cree_par: number | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;
}
