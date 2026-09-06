import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FeatureQuota } from './quota-consommation.entity';

export enum PeriodeReset {
  /** Remise à zéro le 1er de chaque mois. */
  MENSUEL = 'MENSUEL',
  /** Jamais remis à zéro. */
  AVIE = 'AVIE',
}

/**
 * Plafonds des quotas gratuits, réglables depuis le back-office.
 *
 * En dur dans le code, changer « 5 ressources » en « 3 » aurait demandé un
 * déploiement pour un arbitrage purement commercial.
 */
@Entity('configurations_quota')
@Index(['pays', 'feature'], { unique: true })
export class ConfigurationQuota {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'varchar', length: 40 })
  feature: FeatureQuota;

  @Column({ type: 'int' })
  limite: number;

  @Column({ type: 'varchar', length: 20, default: PeriodeReset.MENSUEL })
  periode_reset: PeriodeReset;

  @Column({ type: 'boolean', default: true })
  est_actif: boolean;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;

  @UpdateDateColumn({ name: 'date_modification', type: 'timestamptz' })
  date_modification: Date;
}
