import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalColumnTransformer } from '../../shared/decimal.transformer';
import { FeeType, RewardSourceTypeCode } from '../../shared/payment.enums';
import { PaymentRewardSourceTypeEntity } from './payment-reward-source-type.entity';

@Entity('payment_reward_configurations')
@Index(['rewardSourceTypeCode'], { unique: true })
export class PaymentRewardConfigurationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'reward_source_type_id', type: 'uuid' }) rewardSourceTypeId: string;

  @ManyToOne(() => PaymentRewardSourceTypeEntity, { eager: true })
  @JoinColumn({ name: 'reward_source_type_id' })
  rewardSourceType: PaymentRewardSourceTypeEntity;

  @Column({ name: 'reward_source_type_code', type: 'varchar', length: 50 })
  rewardSourceTypeCode: RewardSourceTypeCode;

  @Column({ name: 'reward_amount', type: 'numeric', precision: 14, scale: 2, default: 100, transformer: DecimalColumnTransformer })
  rewardAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'XOF' }) currency: string;

  /**
   * FIXED : `rewardAmount` s'applique tel quel. PERCENTAGE : la récompense vaut
   * `commissionPercentage` % du montant transmis par l'appelant — nécessaire
   * pour une commission de parrainage, qui suit le prix du plan.
   */
  @Column({ name: 'commission_type', type: 'varchar', length: 20, default: FeeType.FIXED })
  commissionType: FeeType;

  @Column({ name: 'commission_percentage', type: 'numeric', precision: 5, scale: 2, default: 0, transformer: DecimalColumnTransformer })
  commissionPercentage: number;

  @Column({ name: 'reward_enabled', default: true }) rewardEnabled: boolean;

  @Column({ name: 'review_delay_hours', type: 'integer', default: 0 }) reviewDelayHours: number;

  @Column({ name: 'requires_admin_validation', default: false }) requiresAdminValidation: boolean;

  /** 0 = aucune limite journalière en montant. */
  @Column({ name: 'daily_reward_amount_limit', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer })
  dailyRewardAmountLimit: number;

  /** 0 = aucune limite mensuelle en montant. */
  @Column({ name: 'monthly_reward_amount_limit', type: 'numeric', precision: 14, scale: 2, default: 0, transformer: DecimalColumnTransformer })
  monthlyRewardAmountLimit: number;

  /** 0 = aucun plafond journalier en nombre de récompenses. */
  @Column({ name: 'max_rewards_per_user_per_day', type: 'integer', default: 0 }) maxRewardsPerUserPerDay: number;

  /** 0 = aucun plafond mensuel en nombre de récompenses. */
  @Column({ name: 'max_rewards_per_user_per_month', type: 'integer', default: 0 }) maxRewardsPerUserPerMonth: number;

  @Column({ type: 'jsonb', nullable: true }) metadata?: Record<string, unknown> | null;

  @Column({ name: 'is_active', default: true }) isActive: boolean;

  @Column({ name: 'updated_by', type: 'integer', nullable: true }) updatedBy?: number | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
