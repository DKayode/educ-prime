import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { PaymentBatchStatus } from '../../shared/payment.enums';

@Entity('payment_batches')
@Index(['reference'], { unique: true })
export class PaymentBatchEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 150 }) reference: string;
  @Column({ name: 'created_by', type: 'integer' }) createdBy: number;
  @Column({ type: 'enum', enum: PaymentBatchStatus, default: PaymentBatchStatus.DRAFT }) status: PaymentBatchStatus;
  @Column({ name: 'total_amount', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) totalAmount: number;
  @Column({ name: 'total_payments', type: 'integer', default: 0 }) totalPayments: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
