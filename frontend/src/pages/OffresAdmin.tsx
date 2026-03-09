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
import { offresService, OffreItem } from "@/lib/services/offres.service";
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

export default function OffresAdmin() {
    const [selectedStatus, setSelectedStatus] = useState<string | null>("ALL");
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [viewOffre, setViewOffre] = useState<OffreItem | null>(null);
    const [selectedOffreAvisId, setSelectedOffreAvisId] = useState<number | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: offresResponse, isLoading, error } = useQuery({
        queryKey: ['admin-offres', selectedStatus, page, limit],
        queryFn: () => offresService.getAllAdmin({
            status: selectedStatus === "ALL" ? undefined : selectedStatus || undefined,
            page,
            limit,
        }),
    });

    const offres = offresResponse?.data || [];
    const totalPages = offresResponse?.totalPages || 1;

    const { data: avisResponse, isLoading: isLoadingAvis } = useQuery({
        queryKey: ['offre-avis', selectedOffreAvisId],
        queryFn: () => avisService.getAllByModel('Offres', selectedOffreAvisId!),
        enabled: !!selectedOffreAvisId,
    });

    const avisList = avisResponse?.data || [];

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number, status: string }) => offresService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-offres"] });
            toast({
                title: "Statut mis à jour",
                description: "Le statut de l'offre a été modifié avec succès.",
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Validation des Offres</h1>
                    <p className="text-muted-foreground">Approuvez ou rejetez les offres postées par les utilisateurs</p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Liste des offres demandées</CardTitle>
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
                            Erreur lors du chargement des offres
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
                                    {offres.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                Aucune offre trouvée.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        offres.map((offre) => (
                                            <TableRow key={offre.id}>
                                                <TableCell className="font-medium max-w-[200px] truncate" title={offre.titre}>
                                                    {offre.titre}
                                                </TableCell>
                                                <TableCell>
                                                    {offre.utilisateurs ? `${offre.utilisateurs.prenom} ${offre.utilisateurs.nom}` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {offre.type?.nom || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {offre.prix ? `${offre.prix} FCFA` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(offre.status)}>
                                                        {getStatusLabel(offre.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(offre.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewOffre(offre)}
                                                            title="Voir les détails"
                                                        >
                                                            <Eye className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setSelectedOffreAvisId(offre.id)}
                                                            title="Voir les avis"
                                                        >
                                                            <MessageSquare className="h-4 w-4 text-primary" />
                                                        </Button>

                                                        {offre.status === 'pending_approval' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(offre.id, 'active')}
                                                                    title="Approuver & Activer"
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(offre.id, 'declined')}
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

            <Dialog open={!!viewOffre} onOpenChange={(open) => !open && setViewOffre(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Détails de l'offre</DialogTitle>
                        <DialogDescription>Informations complètes sur cette offre</DialogDescription>
                    </DialogHeader>
                    {viewOffre && (
                        <div className="space-y-4 text-sm mt-4">
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Titre</h4>
                                <p>{viewOffre.titre}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Description</h4>
                                <p className="whitespace-pre-wrap">{viewOffre.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Type d'offre</h4>
                                    <p>{viewOffre.type?.nom || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Prix</h4>
                                    <p>{viewOffre.prix ? `${viewOffre.prix} FCFA` : '-'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Statut actuel</h4>
                                    <Badge variant={getStatusBadgeVariant(viewOffre.status)} className="mt-1">
                                        {getStatusLabel(viewOffre.status)}
                                    </Badge>
                                </div>
                            </div>
                            {viewOffre.temps && (
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Temps (en jours/heures)</h4>
                                    <div className="mt-2 text-sm space-y-1">
                                        <p>{viewOffre.temps}</p>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Avis/Comments Dialog */}
            <Dialog open={selectedOffreAvisId !== null} onOpenChange={(open) => !open && setSelectedOffreAvisId(null)}>
                <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Avis et Commentaires</DialogTitle>
                        <DialogDescription>
                            Retour des utilisateurs sur cette offre.
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
                                                {avis.utilisateur ? `${avis.utilisateur.prenom} ${avis.utilisateur.nom}` : 'Anonyme'}
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
                                        {avis.comment ? (
                                            <p className="text-muted-foreground italic">&ldquo;{avis.comment}&rdquo;</p>
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
                </DialogContent >
            </Dialog >
        </div >
    );
}
