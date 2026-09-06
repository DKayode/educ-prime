import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { CampagneCode } from './campagne-code.entity';

export enum TypeCode {
  /** Désigne un bénéficiaire de commission — généré à l'inscription (#246). */
  PARRAINAGE = 'PARRAINAGE',
  /** Comme PARRAINAGE, mais attribué manuellement et cumulable avec une remise. */
  AMBASSADEUR = 'AMBASSADEUR',
  /** Réduit le prix de l'abonnement. Sans propriétaire pour un code marketing. */
  REDUCTION = 'REDUCTION',
}

export enum TypeRemise {
  POURCENTAGE = 'POURCENTAGE',
  MONTANT_FIXE = 'MONTANT_FIXE',
}

@Entity('codes')
@Index(['type'])
export class Code {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  /** Unique sans tenir compte de la casse — voir l'index `uq_codes_code`. */
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 30 })
  type: TypeCode;

  @Column({ type: 'int', nullable: true })
  proprietaire_id: number | null;

  @ManyToOne(() => Utilisateur, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proprietaire_id' })
  proprietaire: Utilisateur | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  libelle: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  remise_type: TypeRemise | null;

  @Column({
    type: 'numeric', precision: 14, scale: 2, nullable: true,
    transformer: { to: (v: number) => v, from: (v: string) => (v === null ? null : Number(v)) },
  })
  remise_valeur: number | null;

  /** `null` = illimité. C'est le « pour n personnes » de l'issue. */
  @Column({ type: 'int', nullable: true })
  usage_max_total: number | null;

  @Column({ type: 'int', default: 1 })
  usage_max_par_utilisateur: number;

  /** Compteur dénormalisé ; `codes_utilisations` reste la source de vérité. */
  @Column({ type: 'int', default: 0 })
  usage_actuel: number;

  @Column({ type: 'timestamptz', nullable: true })
  date_debut: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  date_fin: Date | null;

  /** `null` = tous les plans. */
  @Column({ type: 'int', array: true, nullable: true })
  plans_eligibles: number[] | null;

  @Column({ type: 'boolean', default: true })
  est_actif: boolean;

  @Column({ type: 'int', nullable: true })
  campagne_id: number | null;

  @ManyToOne(() => CampagneCode, { nullable: true })
  @JoinColumn({ name: 'campagne_id' })
  campagne: CampagneCode | null;

  @Column({ type: 'int', nullable: true })
  cree_par: number | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;

  @UpdateDateColumn({ name: 'date_modification', type: 'timestamptz' })
  date_modification: Date;
}
