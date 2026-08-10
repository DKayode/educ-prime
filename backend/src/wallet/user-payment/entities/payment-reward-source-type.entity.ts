import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RewardSourceTypeCode } from '../../shared/payment.enums';

@Entity('payment_reward_source_types')
@Index(['code'], { unique: true })
export class PaymentRewardSourceTypeEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 50 }) code: RewardSourceTypeCode;

  @Column({ type: 'varchar', length: 100 }) label: string;

  @Column({ type: 'text', nullable: true }) description?: string | null;

  @Column({ name: 'is_active', default: true }) isActive: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
