import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, Star, MessageSquare } from "lucide-react";
import { servicesService, ServiceItem } from "@/lib/services/services.service";
import { avisService } from "@/lib/services/avis.service";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function ServicesAdmin() {
    const [selectedStatus, setSelectedStatus] = useState<string | null>("ALL");
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [viewService, setViewService] = useState<ServiceItem | null>(null);
    const [selectedServiceAvisId, setSelectedServiceAvisId] = useState<number | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: servicesResponse, isLoading, error } = useQuery({
        queryKey: ['admin-services', selectedStatus, page, limit],
        queryFn: () => servicesService.getAllAdmin({
            status: selectedStatus === "ALL" ? undefined : selectedStatus || undefined,
            page,
            limit,
        }),
    });

    const services = servicesResponse?.data || [];
    const totalPages = servicesResponse?.totalPages || 1;

    const { data: avisResponse, isLoading: isLoadingAvis } = useQuery({
        queryKey: ['service-avis', selectedServiceAvisId],
        queryFn: () => avisService.getAllByService(selectedServiceAvisId!),
        enabled: !!selectedServiceAvisId,
    });

    const avisList = avisResponse?.data || [];

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number, status: string }) => servicesService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-services"] });
            toast({
                title: "Statut mis à jour",
                description: "Le statut du service a été modifié avec succès.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la mise à jour du statut",
                variant: "destructive",
            });
        },
    });

    const handleUpdateStatus = (id: number, newStatus: string) => {
        updateStatusMutation.mutate({ id, status: newStatus });
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
            case 'approved':
                return 'default';
            case 'pending_approval':
                return 'secondary';
            case 'declined':
                return 'destructive';
            case 'inactive':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Actif';
            case 'approved': return 'Approuvé';
            case 'pending_approval': return 'En Attente';
            case 'declined': return 'Refusé';
            case 'inactive': return 'Inactif';
            default: return status;
        }
    };

    const getDisponibiliteList = (disp: any): string[] => {
        const processItem = (item: any): string => {
            if (typeof item === 'object' && item !== null) {
                if (item.day && item.time) {
                    return `${item.day}: ${item.time}`;
                }
                const entries = Object.entries(item);
                if (entries.length > 0) {
                    return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
                }
                return JSON.stringify(item);
            }
            return String(item);
        };

        try {
            let parsed = disp;
            if (typeof disp === 'string') {
                try {
                    parsed = JSON.parse(disp);
                } catch {
                    parsed = disp;
                }
            }

            if (Array.isArray(parsed)) {
                return parsed.map(processItem);
            }
            if (typeof parsed === 'object' && parsed !== null) {
                return Object.entries(parsed).map(([key, value]) => `${key}: ${value}`);
            }
            return parsed ? [String(parsed)] : [];
        } catch {
            return disp ? [String(disp)] : [];
        }
    }

    const formatAvailabilityItem = (item: string) => {
        const translations: Record<string, string> = {
            'monday': 'Lundi',
            'mon': 'Lundi',
            'tuesday': 'Mardi',
            'tue': 'Mardi',
            'wednesday': 'Mercredi',
            'wed': 'Mercredi',
            'thursday': 'Jeudi',
            'thu': 'Jeudi',
            'friday': 'Vendredi',
            'fri': 'Vendredi',
            'saturday': 'Samedi',
            'sat': 'Samedi',
            'sunday': 'Dimanche',
            'sun': 'Dimanche'
        };

        let formatted = item;
        for (const [en, fr] of Object.entries(translations)) {
            const regex = new RegExp(`\\b${en}\\b`, 'ig');
            formatted = formatted.replace(regex, fr);
        }
        return formatted;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Validation des Services</h1>
                    <p className="text-muted-foreground">Approuvez ou rejetez les services postés par les utilisateurs</p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Liste des services demandés</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                            <Select
                                value={selectedStatus || "ALL"}
                                onValueChange={(value) => {
                                    setSelectedStatus(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-[250px]">
                                    <SelectValue placeholder="Filtrer par statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tous les statuts</SelectItem>
                                    <SelectItem value="pending_approval">En Attente</SelectItem>
                                    <SelectItem value="approved">Approuvés</SelectItem>
                                    <SelectItem value="active">Actifs</SelectItem>
                                    <SelectItem value="declined">Refusés</SelectItem>
                                    <SelectItem value="inactive">Inactifs</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">
                            Erreur lors du chargement des services
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Titre</TableHead>
                                        <TableHead>Auteur</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Prix</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {services.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                Aucun service trouvé.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        services.map((service) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="font-medium max-w-[200px] truncate" title={service.titre}>
                                                    {service.titre}
                                                </TableCell>
                                                <TableCell>
                                                    {service.utilisateurs ? `${service.utilisateurs.prenom} ${service.utilisateurs.nom}` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {service.type?.nom || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {service.tarif ? `${service.tarif} FCFA` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(service.status)}>
                                                        {getStatusLabel(service.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(service.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewService(service)}
                                                            title="Voir les détails"
                                                        >
                                                            <Eye className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setSelectedServiceAvisId(service.id)}
                                                            title="Voir les avis"
                                                        >
                                                            <MessageSquare className="h-4 w-4 text-primary" />
                                                        </Button>

                                                        {service.status === 'pending_approval' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(service.id, 'active')}
                                                                    title="Approuver & Activer"
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(service.id, 'declined')}
                                                                    title="Refuser"
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    <XCircle className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center space-x-2 py-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        Page {page} sur {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!viewService} onOpenChange={(open) => !open && setViewService(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Détails du service</DialogTitle>
                        <DialogDescription>Informations complètes sur ce service</DialogDescription>
                    </DialogHeader>
                    {viewService && (
                        <div className="space-y-4 text-sm mt-4">
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Titre</h4>
                                <p>{viewService.titre}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Description</h4>
                                <p className="whitespace-pre-wrap">{viewService.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Type de service</h4>
                                    <p>{viewService.type?.nom || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Tarif</h4>
                                    <p>{viewService.tarif ? `${viewService.tarif} FCFA` : '-'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Localisation</h4>
                                    <p>{viewService.localisation}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Statut actuel</h4>
                                    <Badge variant={getStatusBadgeVariant(viewService.status)} className="mt-1">
                                        {getStatusLabel(viewService.status)}
                                    </Badge>
                                </div>
                            </div>
                            {viewService.disponibilite && (
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Disponibilité</h4>
                                    <div className="mt-2 text-sm space-y-1">
                                        {getDisponibiliteList(viewService.disponibilite).map((item, index) => (
                                            <p key={index}>{formatAvailabilityItem(item)}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Avis/Comments Dialog */}
            <Dialog open={selectedServiceAvisId !== null} onOpenChange={(open) => !open && setSelectedServiceAvisId(null)}>
                <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Avis et Commentaires</DialogTitle>
                        <DialogDescription>
                            Retour des utilisateurs sur ce service.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-4">
                        {isLoadingAvis ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : avisList.length > 0 ? (
                            <div className="space-y-4">
                                {avisList.map((avis) => (
                                    <div key={avis.id} className="p-3 bg-muted/30 rounded-lg border text-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">
                                                {avis.utilisateurs ? `${avis.utilisateurs.prenom} ${avis.utilisateurs.nom}` : 'Anonyme'}
                                            </span>
                                            <div className="flex items-center space-x-1 text-yellow-500">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`h-4 w-4 ${i < avis.note ? 'fill-current' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                                <span className="ml-2 text-foreground font-semibold">{avis.note}/5</span>
                                            </div>
                                        </div>
                                        {avis.commentaire ? (
                                            <p className="text-muted-foreground italic">&ldquo;{avis.commentaire}&rdquo;</p>
                                        ) : (
                                            <p className="text-muted-foreground text-xs">Aucun commentaire écrit.</p>
                                        )}
                                        <div className="text-xs text-muted-foreground mt-2 text-right">
                                            {new Date(avis.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                                Aucun avis pour le moment.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
