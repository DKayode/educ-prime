import { useState } from 'react';
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
export function NotificationSender() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [channel, setChannel] = useState<'push' | 'email'>('push');



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
                await notificationsService.sendEmail({ title, body });
            }

            toast({
                title: "Succès",
                description: "Notification(s) envoyée(s) avec succès",
            });

            // Reset form
            setTitle('');
            setBody('');
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur",
                description: "Échec de l'envoi de la notification",
                variant: "destructive"
            });
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
            <CardFooter>
                <Button className="w-full" onClick={handleSend} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Envoyer
                </Button>
            </CardFooter>
        </Card>
    );
}
