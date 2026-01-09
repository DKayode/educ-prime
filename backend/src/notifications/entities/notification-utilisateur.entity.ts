// src/notifications/entities/notification-utilisateur.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import { Notification } from './notification.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    CreateDateColumn,
} from 'typeorm';

@Entity('notification_utilisateurs')
@Index(['notification_id', 'utilisateur_id'], { unique: true })
export class NotificationUtilisateur {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'notification_id' })
    notificationId: number;

    @Column({ name: 'utilisateur_id' })
    utilisateurId: number;

    @ApiProperty({ description: 'Indique si la notification a été lue' })
    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @ApiProperty({ description: 'Date de lecture de la notification' })
    @Column({ name: 'read_at', type: 'timestamp', nullable: true })
    readAt: Date | null;

    @ApiProperty({ description: 'Date de création de la relation' })
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Notification, (notification) => notification.notificationUtilisateurs, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'notification_id' })
    notification: Notification;

    @ManyToOne(() => Utilisateur, (utilisateur) => utilisateur.notificationUtilisateurs, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'utilisateur_id' })
    utilisateur: Utilisateur;
}