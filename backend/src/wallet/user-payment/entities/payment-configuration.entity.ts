import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { FeeType } from '../../shared/payment.enums';

@Entity('payment_configurations')
export class PaymentConfigurationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'minimum_withdrawal', type: 'numeric', precision: 14, scale: 2, default: 500, transformer: DecimalColumnTransformer }) minimumWithdrawal: number;
  @Column({ name: 'maximum_withdrawal', type: 'numeric', precision: 14, scale: 2, default: 50000, transformer: DecimalColumnTransformer }) maximumWithdrawal: number;
  @Column({ name: 'withdraw_fee', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) withdrawFee: number;
  @Column({ name: 'withdraw_fee_type', type: 'enum', enum: FeeType, default: FeeType.FIXED }) withdrawFeeType: FeeType;
  @Column({ name: 'reward_per_exam', type: 'numeric', precision: 14, scale: 2, default: 100, transformer: DecimalColumnTransformer }) rewardPerExam: number;
  @Column({ type: 'varchar', length: 10, default: 'XOF' }) currency: string;
  @Column({ name: 'wallet_enabled', default: true }) walletEnabled: boolean;
  @Column({ name: 'withdraw_enabled', default: true }) withdrawEnabled: boolean;
  @Column({ name: 'reward_enabled', default: true }) rewardEnabled: boolean;
  @Column({ name: 'review_delay_hours', type: 'integer', default: 0 }) reviewDelayHours: number;
  @Column({ name: 'daily_withdrawal_limit', type: 'numeric', precision: 14, scale: 2, default: 100000, transformer: DecimalColumnTransformer }) dailyWithdrawalLimit: number;
  @Column({ name: 'monthly_withdrawal_limit', type: 'numeric', precision: 14, scale: 2, default: 500000, transformer: DecimalColumnTransformer }) monthlyWithdrawalLimit: number;
  @Column({ name: 'kyc_threshold', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) kycThreshold: number;
  @Column({ name: 'minimum_wallet_balance', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer }) minimumWalletBalance: number;
  @Column({ name: 'max_withdraw_per_day', type: 'integer', default: 1 }) maxWithdrawPerDay: number;
  @Column({ name: 'max_withdraw_per_week', type: 'integer', default: 3 }) maxWithdrawPerWeek: number;
  @Column({ name: 'max_withdraw_per_month', type: 'integer', default: 10 }) maxWithdrawPerMonth: number;
  @Column({ name: 'automatic_withdrawal', default: false }) automaticWithdrawal: boolean;
  @Column({ name: 'maintenance_mode', default: false }) maintenanceMode: boolean;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ name: 'updated_by', type: 'integer', nullable: true }) updatedBy?: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
