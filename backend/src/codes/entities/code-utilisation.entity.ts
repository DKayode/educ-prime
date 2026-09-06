import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('codes_utilisations')
@Index(['code_id', 'utilisateur_id'])
export class CodeUtilisation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'int' })
  code_id: number;

  @Column({ type: 'int' })
  utilisateur_id: number;

  /** L'utilisation suit son abonnement : l'annuler libère le code. */
  @Column({ type: 'int', nullable: true })
  abonnement_id: number | null;

  @Column({
    type: 'numeric', precision: 14, scale: 2, default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => (v === null ? 0 : Number(v)) },
  })
  montant_remise: number;

  /** Effets réellement appliqués — l'historique reste lisible si le code change. */
  @Column({ type: 'jsonb', nullable: true })
  effets_appliques: Array<{ effet: string; parametres?: Record<string, any> | null }> | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;
}
