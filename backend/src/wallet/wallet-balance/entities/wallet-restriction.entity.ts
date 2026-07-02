import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('wallet_restrictions')
@Index(['userId'], { unique: true })
export class WalletRestrictionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'integer' }) userId: number;
  @Column({ name: 'can_receive_money', default: true }) canReceiveMoney: boolean;
  @Column({ name: 'can_withdraw', default: true }) canWithdraw: boolean;
  @Column({ name: 'can_transfer', default: false }) canTransfer: boolean;
  @Column({ default: false }) blocked: boolean;
  @Column({ name: 'blocked_reason', type: 'text', nullable: true }) blockedReason?: string | null;
  @Column({ name: 'blocked_until', type: 'timestamp', nullable: true }) blockedUntil?: Date | null;
  @Column({ name: 'blocked_by', type: 'integer', nullable: true }) blockedBy?: number | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
