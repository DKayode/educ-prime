import { NotificationSender } from '../components/Notifications/NotificationSender';

export default function NotificationsPage() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground">
                    Gérez et envoyez des notifications push aux utilisateurs.
                </p>
            </div>

            <NotificationSender />
        </div>
    );
}
