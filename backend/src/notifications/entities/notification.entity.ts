import { ApiProperty } from '@nestjs/swagger';
import { Utilisateur } from 'src/utilisateurs/entities/utilisateur.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    ManyToMany,
    JoinTable,
    OneToMany,
} from 'typeorm';
import { NotificationUtilisateur } from './notification-utilisateur.entity';

export enum NotificationType {
    SYSTEM = 'system',
    COMMENT = 'comment',
    LIKE = 'like',
    PARCOURS = 'parcours',
    FOLLOW = 'follow',
    OTHER = 'other',
}

export enum NotificationPriority {
    HIGH = 'high',
    NORMAL = 'normal',
    LOW = 'low',
}

@Entity('notifications')
export class Notification {
    @ApiProperty({ description: 'ID unique de la notification' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: 'Titre de la notification' })
    @Column({ type: 'varchar', length: 255 })
    title: string;

    @ApiProperty({ description: 'Corps du message' })
    @Column({ type: 'text' })
    body: string;

    @ApiProperty({
        description: 'Type de notification',
        enum: NotificationType,
        default: NotificationType.OTHER,
    })
    @Column({
        type: 'enum',
        enum: NotificationType,
        default: NotificationType.OTHER,
    })
    type: NotificationType;

    @ApiProperty({
        description: 'Priorité de la notification',
        enum: NotificationPriority,
        default: NotificationPriority.NORMAL,
    })
    @Column({
        type: 'enum',
        enum: NotificationPriority,
        default: NotificationPriority.NORMAL,
    })
    priority: NotificationPriority;

    @ApiProperty({ description: 'Données supplémentaires au format JSON' })
    @Column({ type: 'jsonb', nullable: true })
    data: Record<string, any>;

    @ApiProperty({ description: 'URL de l\'image à afficher' })
    @Column({ type: 'varchar', length: 500, nullable: true })
    imageUrl: string;

    @ApiProperty({
        description: 'URL pour redirection lors du clic sur la notification',
    })
    @Column({ type: 'varchar', length: 500, nullable: true })
    actionUrl: string;

    @ApiProperty({ description: 'Date de création de la notification' })
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ApiProperty({
        description: 'Date d\'expiration de la notification',
        required: false,
    })
    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date;

    @ApiProperty({
        description: 'Utilisateur qui a déclenché la notification (émetteur)',
        required: false,
    })
    @Column({ name: 'sender_id', type: 'integer', nullable: true })
    senderId?: number;

    @ManyToOne(() => Utilisateur, { nullable: true })
    @JoinColumn({ name: 'sender_id' })
    sender?: Utilisateur;

    @OneToMany(
        () => NotificationUtilisateur,
        (notificationUtilisateur) => notificationUtilisateur.notification,
    )
    notificationUtilisateurs: NotificationUtilisateur[];

    @ApiProperty({ description: 'Nombre total de destinataires' })
    totalRecipients?: number;

    @ApiProperty({ description: 'Nombre de destinataires ayant lu la notification' })
    readCount?: number;
}