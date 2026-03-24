import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailQuestion, CheckCircle2 } from 'lucide-react';
import { notificationsService } from '@/lib/services/notifications.service';
import { useToast } from '@/components/ui/use-toast';

export default function Desabonnement() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const uuid = searchParams.get('uuid');

    useEffect(() => {
        if (!uuid) {
            toast({
                title: "Lien invalide",
                description: "Aucun identifiant de désabonnement trouvé.",
                variant: "destructive"
            });
            navigate('/');
        }
    }, [uuid, navigate, toast]);

    const handleUnsubscribe = async () => {
        if (!uuid) return;
        setLoading(true);
        try {
            await notificationsService.unsubscribeFromEmail({ uuid });
            setSuccess(true);
            toast({
                title: "Désabonnement réussi",
                description: "Vous ne recevrez plus de notifications par email.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors du désabonnement.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 text-green-600 p-3 rounded-full mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-2xl">Désabonnement réussi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Votre demande a bien été prise en compte. Vous ne recevrez plus nos notifications par email concernant les nouveautés de la plateforme.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-orange-100 text-orange-600 p-3 rounded-full mb-4">
                        <MailQuestion className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">Désabonnement</CardTitle>
                    <CardDescription>
                        Êtes-vous sûr de vouloir vous désabonner de nos emails de notification ?
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/')}
                        disabled={loading}
                    >
                        Non, annuler
                    </Button>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={handleUnsubscribe}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Oui, me désabonner
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
