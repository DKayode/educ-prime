import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OtpDeliveryStatus } from '../../shared/payment.enums';

export enum WithdrawalOtpStatus {
  SENT = 'SENT',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  LOCKED = 'LOCKED',
}

@Entity('withdrawal_otps')
@Index(['withdrawalRequestId', 'status'])
@Index(['userId', 'createdAt'])
@Index(['providerMessageId'])
@Index(['deliveryStatus', 'nextDeliveryCheckAt'])
export class WithdrawalOtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'withdrawal_request_id', type: 'uuid' })
  withdrawalRequestId: string;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Column({ name: 'phone_number', type: 'varchar', length: 30 })
  phoneNumber: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 128 })
  codeHash: string;

  /**
   * Champ temporaire réservé au développement mobile.
   * En production, le code ne doit jamais être exposé ni conservé en clair.
   */
  @Column({ name: 'debug_code', type: 'varchar', length: 12, nullable: true })
  debugCode?: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamp', nullable: true })
  consumedAt?: Date | null;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 3 })
  maxAttempts: number;

  @Column({ name: 'resend_count', type: 'integer', default: 0 })
  resendCount: number;

  @Column({ name: 'last_sent_at', type: 'timestamp', nullable: true })
  lastSentAt?: Date | null;

  @Column({ type: 'enum', enum: WithdrawalOtpStatus, default: WithdrawalOtpStatus.SENT })
  status: WithdrawalOtpStatus;

  @Column({ name: 'provider', type: 'varchar', length: 50, default: 'console' })
  provider: string;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 120, nullable: true })
  providerMessageId?: string | null;

  @Column({ name: 'provider_bulk_id', type: 'varchar', length: 120, nullable: true })
  providerBulkId?: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;

  @Column({ name: 'delivery_status', type: 'enum', enum: OtpDeliveryStatus, default: OtpDeliveryStatus.CREATED })
  deliveryStatus: OtpDeliveryStatus;

  @Column({ name: 'provider_status_name', type: 'varchar', length: 120, nullable: true })
  providerStatusName?: string | null;

  @Column({ name: 'provider_status_group_name', type: 'varchar', length: 120, nullable: true })
  providerStatusGroupName?: string | null;

  @Column({ name: 'provider_status_description', type: 'text', nullable: true })
  providerStatusDescription?: string | null;

  @Column({ name: 'delivery_error_code', type: 'varchar', length: 120, nullable: true })
  deliveryErrorCode?: string | null;

  @Column({ name: 'delivery_error_message', type: 'text', nullable: true })
  deliveryErrorMessage?: string | null;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date | null;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt?: Date | null;

  @Column({ name: 'last_provider_callback_at', type: 'timestamp', nullable: true })
  lastProviderCallbackAt?: Date | null;

  @Column({ name: 'delivery_check_count', type: 'integer', default: 0 })
  deliveryCheckCount: number;

  @Column({ name: 'next_delivery_check_at', type: 'timestamp', nullable: true })
  nextDeliveryCheckAt?: Date | null;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt?: Date | null;

  @Column({ name: 'locked_reason', type: 'text', nullable: true })
  lockedReason?: string | null;

  @Column({ name: 'unlocked_at', type: 'timestamp', nullable: true })
  unlockedAt?: Date | null;

  @Column({ name: 'unlocked_by', type: 'integer', nullable: true })
  unlockedBy?: number | null;

  @Column({ name: 'unlock_reason', type: 'text', nullable: true })
  unlockReason?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
