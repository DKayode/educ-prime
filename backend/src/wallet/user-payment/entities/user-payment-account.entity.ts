import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MobileMoneyProvider } from '../../shared/payment.enums';

@Entity('user_payment_accounts')
@Index(['userId', 'isDefault'])
export class UserPaymentAccountEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'integer' }) userId: number;
  @Column({ type: 'enum', enum: MobileMoneyProvider }) operator: MobileMoneyProvider;
  @Column({ name: 'phone_number', type: 'varchar', length: 30 }) phoneNumber: string;
  @Column({ name: 'account_name', type: 'varchar', length: 150 }) accountName: string;
  @Column({ name: 'is_default', default: false }) isDefault: boolean;
  @Column({ default: false }) verified: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
