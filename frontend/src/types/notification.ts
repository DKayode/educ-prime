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

export interface Notification {
    id: number;
    title: string;
    body: string;
    type: NotificationType;
    priority: NotificationPriority;
    data?: Record<string, any>;
    imageUrl?: string;
    actionUrl?: string;
    createdAt: string;
    expiresAt?: string;
    senderId?: number;
    isRead?: boolean; // From NotificationUtilisateur usually
    readAt?: string;
}

export interface SendNotificationDto {
    title: string;
    body: string;
    utilisateurIds?: number[];
    tokens?: string[];
    topic?: string;
    condition?: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

export interface SubscribeTopicDto {
    tokens: string[];
    topic: string;
}
