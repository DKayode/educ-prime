import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Seuil de complétion exigé pour accéder aux ressources académiques (#259).
 *
 * Réglable depuis le back-office : le chiffre est un arbitrage produit, pas une
 * constante technique. Livré DÉSACTIVÉ — mesuré sur la base de production,
 * aucun compte n'atteint 95 %.
 */
@Entity('configurations_profil')
@Index(['pays'], { unique: true })
export class ConfigurationProfil {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'int', default: 95 })
  seuil_completion: number;

  @Column({ type: 'boolean', default: false })
  est_actif: boolean;

  /** Champs retirés du calcul, sans redéploiement. */
  @Column({ type: 'varchar', array: true, nullable: true })
  champs_exclus: string[] | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;

  @UpdateDateColumn({ name: 'date_modification', type: 'timestamptz' })
  date_modification: Date;
}
