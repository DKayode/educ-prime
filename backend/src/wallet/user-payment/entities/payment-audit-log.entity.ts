import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payment_audit_logs')
@Index(['entity', 'entityId'])
export class PaymentAuditLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'admin_id', type: 'integer', nullable: true }) adminId?: number | null;
  @Column({ type: 'varchar', length: 150 }) action: string;
  @Column({ type: 'varchar', length: 120 }) entity: string;
  @Column({ name: 'entity_id', type: 'varchar', length: 150, nullable: true }) entityId?: string | null;
  @Column({ name: 'old_value', type: 'jsonb', nullable: true }) oldValue?: Record<string, unknown> | null;
  @Column({ name: 'new_value', type: 'jsonb', nullable: true }) newValue?: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) ip?: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
