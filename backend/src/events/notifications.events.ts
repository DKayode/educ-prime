export enum NotificationEventType {
    PARCOURS_CREATED = 'parcours.created',
    EVENEMENTS_CREATED = 'evenements.created',
    OPPORTUNITEES_CREATED = 'opportunitees.created',
    CONCOURS_CREATED = 'concours.created',

}

// Notifier les utilisateurs après la création d'une parcour
export class ParcoursNotifEvent {
    constructor(
        public readonly title: string,
        public readonly body: string,
        public readonly type?: string,
        public readonly priority?: string,
        public readonly data?: Record<string, any>,
        public readonly senderId?: number,
    ) { }
}

// Notifier les utilisateurs après la création d'un evenement
export class EvenementNotifEvent {
    constructor(
        public readonly title: string,
        public readonly body: string,
        public readonly type?: string,
        public readonly priority?: string,
        public readonly data?: Record<string, any>,
        public readonly senderId?: number,
    ) { }
}

// Notifier les utilisateurs après la création d'une opportunitée
export class OpportuniteNotifEvent {
    constructor(
        public readonly title: string,
        public readonly body: string,
        public readonly type?: string,
        public readonly priority?: string,
        public readonly data?: Record<string, any>,
        public readonly senderId?: number,
    ) { }
}

// Notifier les utilisateurs après la création d'un concours
export class ConcoursNotifEvent {
    constructor(
        public readonly title: string,
        public readonly body: string,
        public readonly type?: string,
        public readonly priority?: string,
        public readonly data?: Record<string, any>,
        public readonly senderId?: number,
    ) { }
}