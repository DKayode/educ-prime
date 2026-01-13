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
    const [type, setType] = useState<NotificationType>(NotificationType.SYSTEM);
    const [priority, setPriority] = useState<NotificationPriority>(NotificationPriority.NORMAL);
    const [topic, setTopic] = useState('');
    const [tokens, setTokens] = useState('');
    const [targetType, setTargetType] = useState<'topic' | 'tokens'>('topic');

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
            const payload: any = {
                title,
                body,
                data: {
                    type,
                    priority
                }
            };

            if (targetType === 'topic' && topic) {
                payload.topic = topic;
            } else if (targetType === 'tokens' && tokens) {
                payload.tokens = tokens.split(',').map(t => t.trim());
            } else {
                // Fallback to sending to all (if backend supports it via empty target or specific logic, 
                // otherwise enforce target)
                // Based on service if no target, it gets all tokens.
                // let's just warn if no target for now unless intended
            }

            await notificationsService.send(payload);

            toast({
                title: "Succès",
                description: "Notification envoyée avec succès",
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
                <CardDescription>Envoyer une notification push via Firebase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(v: NotificationType) => setType(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(NotificationType).map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Priorité</Label>
                        <Select value={priority} onValueChange={(v: NotificationPriority) => setPriority(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Priorité" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(NotificationPriority).map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Cible</Label>
                    <Select value={targetType} onValueChange={(v: 'topic' | 'tokens') => setTargetType(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="topic">Topic</SelectItem>
                            <SelectItem value="tokens">Tokens (séparés par virgule)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {targetType === 'topic' ? (
                    <div className="space-y-2">
                        <Label>Topic</Label>
                        <Input
                            placeholder="ex: news, promo, users"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Laisser vide pour envoyer à tous (si supporté)</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label>Tokens</Label>
                        <Textarea
                            placeholder="Tokens FCM..."
                            value={tokens}
                            onChange={(e) => setTokens(e.target.value)}
                        />
                    </div>
                )}

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
