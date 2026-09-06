import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TypeEvenementAbonnement {
  CREE = 'CREE',
  PAYE = 'PAYE',
  ACTIVE = 'ACTIVE',
  EXPIRE = 'EXPIRE',
  ANNULE = 'ANNULE',
  REMBOURSE = 'REMBOURSE',
  PROLONGE = 'PROLONGE',
  COMMISSION_VERSEE = 'COMMISSION_VERSEE',
  /** Refus simulé pendant que le verrou est éteint — sert à mesurer l'impact. */
  ACCES_REFUSE_SIMULE = 'ACCES_REFUSE_SIMULE',
}

@Entity('abonnement_evenements')
@Index(['abonnement_id', 'date_creation'])
export class AbonnementEvenement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  abonnement_id: number;

  @Column({ type: 'varchar', length: 40 })
  type: TypeEvenementAbonnement;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'date_creation', type: 'timestamptz' })
  date_creation: Date;
}
