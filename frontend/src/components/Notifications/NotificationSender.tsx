import { useState, useEffect } from 'react';
import { notificationsService } from '../../lib/services/notifications.service';
import { NotificationType, NotificationPriority } from '../../types/notification';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
export function NotificationSender() {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canSendNotification = hasPermission(Permission.NOTIFICATIONS_SEND);
    const canCancelNotification = hasPermission(Permission.NOTIFICATIONS_CANCEL);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [channel, setChannel] = useState<'push' | 'email'>('push');
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<any>(null);

    // Use the generic `active_broadcast_id` instead for new jobs, this clears legacy
    useEffect(() => {
        const legacyMailJob = localStorage.getItem('active_email_broadcast_id');
        if (legacyMailJob) {
           localStorage.removeItem('active_email_broadcast_id');
           localStorage.setItem('active_broadcast_id', legacyMailJob);
           localStorage.setItem('active_broadcast_channel', 'email');
        }
    }, []);

    // Polling logic
    useEffect(() => {
        if (!activeJobId) return;

        const pollStatus = async () => {
            try {
                let data: any;
                if (channel === 'email') {
                    data = await notificationsService.getEmailJobStatus(activeJobId);
                } else {
                    data = await notificationsService.getPushJobStatus(activeJobId);
                }
                
                setJobStatus(data);

                if (data.status === 'completed') {
                    toast({
                        title: "Succès",
                        description: `Envoi groupé terminé : ${data.sentCount} réussis, ${data.failedCount} échoués sur ${data.totalCount}.`,
                    });
                    localStorage.removeItem('active_broadcast_id');
                    localStorage.removeItem('active_broadcast_channel');
                    setActiveJobId(null);
                    setJobStatus(null);
                } else if (data.status === 'failed') {
                    toast({
                        title: "Erreur",
                        description: `L'envoi a échoué : ${data.failedReason || 'Inconnu'}`,
                        variant: "destructive"
                    });
                    localStorage.removeItem('active_broadcast_id');
                    localStorage.removeItem('active_broadcast_channel');
                    setActiveJobId(null);
                }
            } catch (error) {
                console.error("Polling error:", error);
                setJobStatus({ status: 'offline', message: "Serveur injoignable. Vérifiez votre connexion." });
            }
        };

        pollStatus();
        const interval = setInterval(pollStatus, 3000);

        return () => clearInterval(interval);
    }, [activeJobId, toast, channel]);

    // Recover channel from localStorage if job exists
    useEffect(() => {
        const savedJobId = localStorage.getItem('active_broadcast_id');
        const savedChannel = localStorage.getItem('active_broadcast_channel') as 'push' | 'email';
        if (savedJobId) {
            setActiveJobId(savedJobId);
            if (savedChannel) setChannel(savedChannel);
        }
    }, []);



    const handleSend = async () => {
        if (!title || !body) {
            toast({
                title: "Erreur",
                description: "Le titre et le message sont requis",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            if (channel === 'push') {
                const payload: any = {
                    title,
                    body,
                    utilisateurIds: [],
                    data: {
                        priority: NotificationPriority.NORMAL
                    }
                };
                const response = await notificationsService.send(payload) as any;
                const jobId = response.jobId;
                if (jobId) {
                    setActiveJobId(jobId);
                    localStorage.setItem('active_broadcast_id', jobId);
                    localStorage.setItem('active_broadcast_channel', 'push');
                    toast({
                        title: "Envoi push lancé",
                        description: "La notification push a été mise en file d'attente.",
                    });
                }
            } else if (channel === 'email') {
                const response = await notificationsService.sendEmail({ title, body }) as any;
                const jobId = response.jobId;
                if (jobId) {
                    setActiveJobId(jobId);
                    localStorage.setItem('active_broadcast_id', jobId);
                    localStorage.setItem('active_broadcast_channel', 'email');
                    toast({
                        title: "Envoi email lancé",
                        description: "L'envoi d'emails en masse a été mis en file d'attente.",
                    });
                }
            }

            setTitle('');
            setBody('');
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur",
                description: "Échec de l'envoi de la notification. Consultez la console pour plus de détails.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!activeJobId) return;
        setLoading(true);
        try {
            if (channel === 'email') {
                await notificationsService.cancelEmailJob(activeJobId);
            } else {
                await notificationsService.cancelPushJob(activeJobId);
            }
            localStorage.removeItem('active_broadcast_id');
            localStorage.removeItem('active_broadcast_channel');
            setActiveJobId(null);
            setJobStatus(null);
            toast({
                title: "Annulé",
                description: "L'envoi a été arrêté.",
            });
        } catch (error) {
            console.error("Cancel error:", error);
            localStorage.removeItem('active_broadcast_id');
            localStorage.removeItem('active_broadcast_channel');
            setActiveJobId(null);
            setJobStatus(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Envoyer une Notification</CardTitle>
                <CardDescription>Envoyer une notification push ou email à vos utilisateurs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Canal d'envoi</Label>
                    <Select value={channel} onValueChange={(val: any) => setChannel(val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le canal" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="push">Mobile (Push uniquement)</SelectItem>
                            <SelectItem value="email" disabled>Email uniquement (Désactivé)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Titre</Label>
                    <Input
                        placeholder="Titre de la notification"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                        placeholder="Contenu du message"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                </div>



            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                {activeJobId && jobStatus && (
                    <Alert className={`w-full ${jobStatus.status === 'offline' ? 'border-destructive' : ''}`}>
                        <Clock className={`h-4 w-4 ${jobStatus.status === 'offline' ? 'text-destructive' : ''}`} />
                        <AlertTitle>
                            {jobStatus.status === 'offline' ? 'Erreur de Connexion' : `Envoi en cours (${jobStatus.progress || 0}%)`}
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                            {jobStatus.status === 'offline' ? (
                                <p className="text-destructive font-medium">{jobStatus.message}</p>
                            ) : (
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Réussis: {jobStatus.sentCount || 0}</span>
                                        <span>Échoués: {jobStatus.failedCount || 0}</span>
                                        <span>Total: {jobStatus.totalCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-blue-600 bg-blue-50 p-1 rounded">
                                        <span>Quotas du jour: {jobStatus.dailyCount || 0} / {jobStatus.dailyLimit || 1000}</span>
                                        <span>{jobStatus.status === 'completed' ? 'Terminé' : 'En cours...'}</span>
                                    </div>
                                </div>
                            )}
                            <Progress 
                                value={jobStatus.progress || 0} 
                                className={`h-2 ${jobStatus.status === 'offline' ? 'opacity-50' : ''}`} 
                            />
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full mt-2 h-8 text-xs text-destructive hover:bg-destructive/10"
                                onClick={handleCancel}
                                disabled={loading || !canCancelNotification}
                            >
                                Arrêter / Réinitialiser
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <Button className="w-full" onClick={handleSend} disabled={loading || !!activeJobId || !canSendNotification}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {!canSendNotification ? "Droit d'envoi requis" : activeJobId ? "Batch en cours..." : "Lancer l'envoi"}
                </Button>
            </CardFooter>
        </Card>
    );
}
