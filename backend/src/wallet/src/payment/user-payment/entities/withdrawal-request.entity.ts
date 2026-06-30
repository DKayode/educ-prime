import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { PaymentMethod, WithdrawalStatus } from '../../shared/payment.enums';

@Entity('withdrawal_requests')
@Index(['walletId', 'status'])
export class WithdrawalRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'wallet_id', type: 'uuid' }) walletId: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) amount: number;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) fees: number;
  @Column({ name: 'net_amount', type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) netAmount: number;
  @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING }) status: WithdrawalStatus;
  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, default: PaymentMethod.MOBILE_MONEY }) paymentMethod: PaymentMethod;
  @Column({ name: 'payment_account_id', type: 'uuid', nullable: true }) paymentAccountId?: string | null;
  @Column({ name: 'approved_by', type: 'integer', nullable: true }) approvedBy?: number | null;
  @Column({ name: 'approved_at', type: 'timestamp', nullable: true }) approvedAt?: Date | null;
  @Column({ name: 'rejected_by', type: 'integer', nullable: true }) rejectedBy?: number | null;
  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true }) rejectedAt?: Date | null;
  @Column({ name: 'rejected_reason', type: 'text', nullable: true }) rejectedReason?: string | null;
  @Column({ name: 'payment_deadline', type: 'timestamp', nullable: true }) paymentDeadline?: Date | null;
  @Column({ type: 'integer', default: 0 }) priority: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
