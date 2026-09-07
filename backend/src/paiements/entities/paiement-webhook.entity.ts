import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { PrestatairePaiement } from '../shared/paiement.enums';

@Entity('paiement_webhooks')
@Index(['prestataire', 'evenement_id'], { unique: true })
export class PaiementWebhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  prestataire: PrestatairePaiement;

  @Column({ type: 'varchar', length: 150 })
  evenement_id: string;

  @Column({ type: 'boolean' })
  signature_valide: boolean;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  traite: boolean;

  @Column({ type: 'text', nullable: true })
  erreur_traitement: string | null;

  @CreateDateColumn({ name: 'date_reception', type: 'timestamptz' })
  date_reception: Date;
}
