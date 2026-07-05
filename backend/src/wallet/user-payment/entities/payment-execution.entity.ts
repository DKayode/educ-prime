import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { MobileMoneyProvider, PaymentExecutionStatus, PaymentMethod } from '../../shared/payment.enums';

@Entity('payment_executions')
@Index(['transactionReference'], { unique: true })
export class PaymentExecutionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'withdrawal_request_id', type: 'uuid' }) withdrawalRequestId: string;
  @Column({ name: 'executed_by', type: 'integer' }) executedBy: number;
  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, default: PaymentMethod.MOBILE_MONEY }) paymentMethod: PaymentMethod;
  @Column({ type: 'enum', enum: MobileMoneyProvider }) provider: MobileMoneyProvider;
  @Column({ name: 'transaction_reference', type: 'varchar', length: 150 }) transactionReference: string;
  @Column({ name: 'phone_number', type: 'varchar', length: 30 }) phoneNumber: string;
  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) paidAmount: number;
  @Column({ type: 'text', nullable: true }) comment?: string | null;
  @Column({ name: 'internal_note', type: 'text', nullable: true }) internalNote?: string | null;
  @Column({ type: 'enum', enum: PaymentExecutionStatus, default: PaymentExecutionStatus.COMPLETED }) status: PaymentExecutionStatus;
  @Column({ name: 'paid_at', type: 'timestamp' }) paidAt: Date;
  @Column({ name: 'batch_id', type: 'uuid', nullable: true }) batchId?: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
