import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentNotificationType } from '../../shared/payment.enums';

@Entity('payment_notifications')
@Index(['userId', 'isRead'])
export class PaymentNotificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'integer', nullable: true }) userId?: number | null;
  @Column({ type: 'varchar', length: 180 }) title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'enum', enum: PaymentNotificationType }) type: PaymentNotificationType;
  @Column({ name: 'is_read', default: false }) isRead: boolean;
  @Column({ name: 'for_admins', default: false }) forAdmins: boolean;
  @Column({ type: 'jsonb', nullable: true }) metadata?: Record<string, unknown> | null;
  @Column({ name: 'fcm_status', type: 'varchar', length: 30, default: 'NOT_SENT' }) fcmStatus: string;
  @Column({ name: 'fcm_message_id', type: 'varchar', length: 255, nullable: true }) fcmMessageId?: string | null;
  @Column({ name: 'fcm_success_count', type: 'integer', default: 0 }) fcmSuccessCount: number;
  @Column({ name: 'fcm_failure_count', type: 'integer', default: 0 }) fcmFailureCount: number;
  @Column({ name: 'fcm_failure_reason', type: 'text', nullable: true }) fcmFailureReason?: string | null;
  @Column({ name: 'fcm_sent_at', type: 'timestamp', nullable: true }) fcmSentAt?: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
