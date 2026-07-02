import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MobileMoneyProvider } from '../../shared/payment.enums';

@Entity('user_payment_account_history')
export class UserPaymentAccountHistoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'integer' }) userId: number;
  @Column({ name: 'old_phone_number', type: 'varchar', length: 30, nullable: true }) oldPhoneNumber?: string | null;
  @Column({ name: 'new_phone_number', type: 'varchar', length: 30 }) newPhoneNumber: string;
  @Column({ name: 'old_operator', type: 'enum', enum: MobileMoneyProvider, nullable: true }) oldOperator?: MobileMoneyProvider | null;
  @Column({ name: 'new_operator', type: 'enum', enum: MobileMoneyProvider }) newOperator: MobileMoneyProvider;
  @Column({ name: 'changed_by', type: 'integer' }) changedBy: number;
  @CreateDateColumn({ name: 'changed_at' }) changedAt: Date;
}
