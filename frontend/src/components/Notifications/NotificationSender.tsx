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
export function NotificationSender() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [channel, setChannel] = useState<'push' | 'email'>('push');
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<any>(null);

    // Persist job tracking across refreshes
    useEffect(() => {
        const savedJobId = localStorage.getItem('active_email_broadcast_id');
        if (savedJobId) {
            setActiveJobId(savedJobId);
        }
    }, []);

    // Polling logic
    useEffect(() => {
        if (!activeJobId) return;

        const pollStatus = async () => {
            try {
                const data = await notificationsService.getEmailJobStatus(activeJobId) as any;
                setJobStatus(data);

                if (data.status === 'completed') {
                    toast({
                        title: "Succès",
                        description: `Envoi groupé terminé : ${data.sentCount} réussis, ${data.failedCount} échoués sur ${data.totalCount}.`,
                    });
                    localStorage.removeItem('active_email_broadcast_id');
                    setActiveJobId(null);
                    setJobStatus(null);
                } else if (data.status === 'failed') {
                    toast({
                        title: "Erreur",
                        description: `L'envoi a échoué : ${data.failedReason || 'Inconnu'}`,
                        variant: "destructive"
                    });
                    localStorage.removeItem('active_email_broadcast_id');
                    setActiveJobId(null);
                }
            } catch (error) {
                console.error("Polling error:", error);
                setJobStatus({ status: 'offline', message: "Serveur injoignable. Vérifiez votre connexion." });
            }
        };

        pollStatus(); // Initial poll
        const interval = setInterval(pollStatus, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [activeJobId, toast]);



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
                await notificationsService.send(payload);
            }

            if (channel === 'email') {
                const response = await notificationsService.sendEmail({ title, body }) as any;
                const jobId = response.jobId;
                if (jobId) {
                    setActiveJobId(jobId);
                    localStorage.setItem('active_email_broadcast_id', jobId);
                    toast({
                        title: "Envoi lancé",
                        description: "L'envoi en masse a été mis en file d'attente.",
                    });
                }
            } else {
                toast({
                    title: "Succès",
                    description: "Notification(s) envoyée(s) avec succès",
                });
            }

            // Reset form
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
            await notificationsService.cancelEmailJob(activeJobId);
            localStorage.removeItem('active_email_broadcast_id');
            setActiveJobId(null);
            setJobStatus(null);
            toast({
                title: "Annulé",
                description: "L'envoi a été arrêté.",
            });
        } catch (error) {
            console.error("Cancel error:", error);
            // Even if it fails on server, let's clear local state if user is stuck
            localStorage.removeItem('active_email_broadcast_id');
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
                            <SelectItem value="email">Email uniquement</SelectItem>
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
                                disabled={loading}
                            >
                                Arrêter / Réinitialiser
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <Button className="w-full" onClick={handleSend} disabled={loading || !!activeJobId}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {activeJobId ? "Batch en cours..." : "Lancer l'envoi"}
                </Button>
            </CardFooter>
        </Card>
    );
}
