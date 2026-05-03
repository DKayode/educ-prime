import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Utilisateur } from '../../utilisateurs/entities/utilisateur.entity';

@Entity('forums')
export class Forum {
    @ApiProperty({ description: 'The unique identifier of the forum', example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'UUID of the forum' })
    @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
    uuid: string;

    @ApiProperty({ description: 'The theme or title of the forum discussion', example: 'Mathematics Discussion' })
    @Column()
    theme: string;

    @ApiProperty({ description: 'The main content or body of the forum post', example: 'How do I solve quadratic equations?' })
    @Column({ type: 'text' })
    content: string;

    @ApiProperty({ required: false, description: 'URL of the optional photo attached to the forum', example: 'https://storage.googleapis.com/.../image.jpg' })
    @Column({ nullable: true })
    photo: string;

    @ApiProperty({ description: 'ID of the user who created the forum' })
    @Column()
    user_id: number;

    @ApiProperty({ description: 'Date when the forum was created' })
    @CreateDateColumn()
    created_at: Date;

    @ApiProperty({ description: 'Date when the forum was last updated' })
    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;

    @ManyToOne(() => Utilisateur, utilisateur => utilisateur.forums)
    @JoinColumn({ name: 'user_id' })
    user: Utilisateur;

    // Additional fields for DTO responses
    @ApiProperty({ description: 'Total number of likes', required: false })
    nb_like?: number;

    @ApiProperty({ description: 'Flag indicating if the current user liked this forum', required: false })
    is_like?: boolean;

    @ApiProperty({ description: 'Total number of comments', required: false })
    nb_comment?: number;

    isLiked?: boolean;
}

export type ForumEntity = Forum;
