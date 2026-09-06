import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Code } from './code.entity';

/**
 * Effets qu'un code peut porter. Un code en cumule 0..n.
 *
 * Cette liste remplace l'énumération de types : « ambassadeur » n'était pas une
 * nature mais une composition (COMMISSION + REDUCTION), et nommer chaque
 * combinaison aurait demandé 2^n valeurs.
 */
export enum Effet {
  /** Baisse le prix de l'abonnement. */
  REDUCTION = 'REDUCTION',
  /** Verse une commission au propriétaire du code. */
  COMMISSION = 'COMMISSION',
  /** Ouvre l'abonnement sans encaissement — chèque-cadeau, dotation, geste commercial. */
  ABONNEMENT_OFFERT = 'ABONNEMENT_OFFERT',
}

export enum TypeRemise {
  POURCENTAGE = 'POURCENTAGE',
  MONTANT_FIXE = 'MONTANT_FIXE',
}

/** Paramètres de `REDUCTION`. */
export interface ParametresReduction {
  type: TypeRemise;
  valeur: number;
}

/** Paramètres de `COMMISSION`. `taux` absent = celui réglé globalement (#246). */
export interface ParametresCommission {
  taux?: number;
}

/**
 * Paramètres d'`ABONNEMENT_OFFERT`.
 * `duree_jours` absent = la durée du plan choisi.
 */
export interface ParametresAbonnementOffert {
  duree_jours?: number;
}

@Entity('code_effets')
@Index(['code_id', 'effet'], { unique: true })
export class CodeEffet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  code_id: number;

  @ManyToOne(() => Code, (code) => code.effets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'code_id' })
  code: Code;

  @Column({ type: 'varchar', length: 40 })
  effet: Effet;

  @Column({ type: 'jsonb', nullable: true })
  parametres: Record<string, any> | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;
}
