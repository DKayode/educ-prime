import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';
import { PlanAbonnement } from './plan-abonnement.entity';

export enum StatutAbonnement {
  EN_ATTENTE = 'EN_ATTENTE',
  ACTIF = 'ACTIF',
  EXPIRE = 'EXPIRE',
  ANNULE = 'ANNULE',
  REMBOURSE = 'REMBOURSE',
}

@Entity('abonnements')
@Index(['utilisateur_id', 'statut', 'date_fin'])
export class Abonnement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'int' })
  utilisateur_id: number;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ type: 'int' })
  plan_id: number;

  @ManyToOne(() => PlanAbonnement, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: PlanAbonnement;

  @Column({ type: 'varchar', length: 30, default: StatutAbonnement.EN_ATTENTE })
  statut: StatutAbonnement;

  @Column({ type: 'timestamptz', nullable: true })
  date_debut: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  date_fin: Date | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: { to: (v: number) => v, from: (v: string) => (v === null ? null : Number(v)) } })
  montant_paye: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  devise: string;

  /** Colonne posée pour #248 ; aucun mécanisme de renouvellement dans cette issue. */
  @Column({ type: 'boolean', default: false })
  renouvellement_auto: boolean;

  /**
   * Parrain FIGÉ à la souscription (#246). Un changement ultérieur de la
   * relation de parrainage ne doit pas rétro-attribuer une commission.
   */
  @Column({ type: 'int', nullable: true })
  parrain_id: number | null;

  @Column({ type: 'boolean', default: false })
  commission_versee: boolean;

  /** Code utilisé à l'achat et remise obtenue (#247). */
  @Column({ type: 'int', nullable: true })
  code_id: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: { to: (v: number) => v, from: (v: string) => (v === null ? 0 : Number(v)) } })
  montant_remise: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;

  @UpdateDateColumn({ name: 'date_modification', type: 'timestamptz' })
  date_modification: Date;
}
