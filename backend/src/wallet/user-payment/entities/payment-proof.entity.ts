import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payment_proofs')
export class PaymentProofEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'payment_execution_id', type: 'uuid' }) paymentExecutionId: string;
  @Column({ name: 'file_name', type: 'varchar', length: 255 }) fileName: string;
  @Column({ name: 'file_url', type: 'text' }) fileUrl: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 120 }) mimeType: string;
  @Column({ name: 'uploaded_by', type: 'integer' }) uploadedBy: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
