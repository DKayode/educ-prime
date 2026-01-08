import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('blacklisted_tokens')
export class BlacklistedToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    token: string;

    @Column({ type: 'timestamp with time zone' })
    date_expiration: Date;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
    date_creation: Date;
}
