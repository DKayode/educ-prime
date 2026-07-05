import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum WithdrawalOtpStatus {
  SENT = 'SENT',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

@Entity('withdrawal_otps')
@Index(['withdrawalRequestId', 'status'])
@Index(['userId', 'createdAt'])
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

  @Column({ type: 'enum', enum: WithdrawalOtpStatus, default: WithdrawalOtpStatus.SENT })
  status: WithdrawalOtpStatus;

  @Column({ name: 'provider', type: 'varchar', length: 50, default: 'console' })
  provider: string;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 120, nullable: true })
  providerMessageId?: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
