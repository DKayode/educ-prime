import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Ressources éligibles au quota gratuit. Les concours en sont exclus : ils sont payants d'emblée (#244). */
export type TypeRessourceQuota = 'epreuve' | 'examen_national';

export enum FeatureQuota {
  /** Consultation d'une ressource académique — pool commun épreuves + examens. */
  RESOURCE_VIEW = 'RESOURCE_VIEW',
  /** Lancement de l'assistante Ketsia sur une ressource. */
  KETSIA_AI = 'KETSIA_AI',
}

@Entity('quota_consommations')
@Index(['utilisateur_id', 'feature', 'resource_type', 'resource_id', 'periode'], { unique: true })
export class QuotaConsommation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, default: 'benin' })
  pays: string;

  @Column({ type: 'int' })
  utilisateur_id: number;

  @Column({ type: 'varchar', length: 40 })
  feature: FeatureQuota;

  @Column({ type: 'varchar', length: 30 })
  resource_type: TypeRessourceQuota;

  @Column({ type: 'int' })
  resource_id: number;

  /**
   * `YYYY-MM` pour un quota mensuel, `AVIE` pour un quota non renouvelable.
   *
   * La période est portée par la LIGNE plutôt que déduite d'une date au moment
   * de la lecture : c'est ce qui garde l'index unique utilisable, et donc la
   * protection contre la double consommation sous concurrence.
   */
  @Column({ type: 'varchar', length: 10 })
  periode: string;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;
}
