import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

@Entity('commentaire_users')
export class CommentaireUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint' })
    commentable_id: string;

    @Column()
    commentable_type: string;

    @Column({ nullable: true })
    commentaire_id: number;

    @Column({ type: 'text' })
    content: string;

    @Column()
    user_id: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;

    @ManyToOne(() => Utilisateur)
    @JoinColumn({ name: 'user_id' })
    user: Utilisateur;

    @ManyToOne(() => CommentaireUser, parent => parent.children, { nullable: true })
    @JoinColumn({ name: 'commentaire_id' })
    parent: CommentaireUser;

    @OneToMany(() => CommentaireUser, child => child.parent)
    children: CommentaireUser[];
}
