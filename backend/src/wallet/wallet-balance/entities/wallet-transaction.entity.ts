import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { WalletTransactionStatus, WalletTransactionType } from '../../shared/payment.enums';

@Entity('wallet_transactions')
@Index(['reference'], { unique: true })
@Index(['walletId', 'createdAt'])
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'wallet_id', type: 'uuid' }) walletId: string;
  @Column({ type: 'enum', enum: WalletTransactionType }) type: WalletTransactionType;
  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) amount: number;
  @Column({ name: 'balance_before', type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) balanceBefore: number;
  @Column({ name: 'balance_after', type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) balanceAfter: number;
  @Column({ name: 'available_balance_after', type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) availableBalanceAfter: number;
  @Column({ name: 'pending_balance_after', type: 'numeric', precision: 14, scale: 2, transformer: DecimalColumnTransformer }) pendingBalanceAfter: number;
  @Column({ type: 'varchar', length: 150 }) reference: string;
  @Column({ type: 'text', nullable: true }) description?: string | null;
  @Column({ type: 'enum', enum: WalletTransactionStatus, default: WalletTransactionStatus.COMPLETED }) status: WalletTransactionStatus;
  @Column({ name: 'created_by', type: 'integer', nullable: true }) createdBy?: number | null;
  @Column({ type: 'jsonb', nullable: true }) metadata?: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
