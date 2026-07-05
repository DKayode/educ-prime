import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { WalletStatus } from '../../shared/payment.enums';

@Entity('wallets')
@Index(['userId'], { unique: true })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'integer' }) userId: number;
  @Column({ name: 'available_balance', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) availableBalance: number;
  @Column({ name: 'pending_balance', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) pendingBalance: number;
  @Column({ type: 'varchar', length: 10, default: 'XOF' }) currency: string;
  @Column({ type: 'enum', enum: WalletStatus, default: WalletStatus.ACTIVE }) status: WalletStatus;
  @VersionColumn() version: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
