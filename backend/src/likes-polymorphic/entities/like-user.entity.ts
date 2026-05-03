import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

@Entity('like_users')
export class LikeUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint' })
    likeable_id: string;

    @Column()
    likeable_type: string;

    @Column()
    user_id: number;

    @CreateDateColumn()
    created_at: Date;

    @ManyToOne(() => Utilisateur)
    @JoinColumn({ name: 'user_id' })
    user: Utilisateur;
}
