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
import { Loader2, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { recruteursService, RecruteurItem } from "@/lib/services/recruteurs.service";
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

export default function RecruteursAdmin() {
    const [selectedStatus, setSelectedStatus] = useState<string | null>("ALL");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [viewRecruteur, setViewRecruteur] = useState<RecruteurItem | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: recruteurs = [], isLoading, error } = useQuery({
        queryKey: ['admin-recruteurs'],
        queryFn: () => recruteursService.getAllAdmin(),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number, status: string }) => recruteursService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-recruteurs"] });
            toast({
                title: "Statut mis à jour",
                description: "Le statut du recruteur a été modifié avec succès.",
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

    const handleLimitChange = (val: string) => {
        setLimit(parseInt(val));
        setPage(1);
    };

    const filteredRecruteurs = selectedStatus === "ALL"
        ? recruteurs
        : recruteurs.filter((r) => r.status === selectedStatus);

    const totalPages = Math.ceil(filteredRecruteurs.length / limit) || 1;
    const paginatedRecruteurs = filteredRecruteurs.slice((page - 1) * limit, page * limit);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Validation des Recruteurs</h1>
                    <p className="text-muted-foreground">Approuvez ou rejetez les profils de recruteurs</p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Liste des recruteurs</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                            <Select
                                value={selectedStatus || "ALL"}
                                onValueChange={(value) => {
                                    setSelectedStatus(value);
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

                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Items par page:</span>
                                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                            Erreur lors du chargement des recruteurs
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom Complet</TableHead>
                                        <TableHead>Email Utilisateur</TableHead>
                                        <TableHead>IFU</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Date création</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecruteurs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Aucun recruteur trouvé.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedRecruteurs.map((recruteur) => (
                                            <TableRow key={recruteur.id}>
                                                <TableCell className="font-medium">
                                                    {recruteur.prenom} {recruteur.nom}
                                                </TableCell>
                                                <TableCell>
                                                    {recruteur.utilisateurs ? recruteur.utilisateurs.email : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {recruteur.numero_ifu || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(recruteur.status)}>
                                                        {getStatusLabel(recruteur.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(recruteur.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setViewRecruteur(recruteur)}
                                                            title="Voir les détails"
                                                        >
                                                            <Eye className="h-4 w-4 text-blue-500" />
                                                        </Button>

                                                        {recruteur.status === 'pending_approval' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(recruteur.id, 'active')}
                                                                    title="Approuver & Activer"
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(recruteur.id, 'declined')}
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

            <Dialog open={!!viewRecruteur} onOpenChange={(open) => !open && setViewRecruteur(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Détails du recruteur</DialogTitle>
                        <DialogDescription>Informations complètes sur ce profil</DialogDescription>
                    </DialogHeader>
                    {viewRecruteur && (
                        <div className="space-y-4 text-sm mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Nom</h4>
                                    <p>{viewRecruteur.nom}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Prénom</h4>
                                    <p>{viewRecruteur.prenom}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Nom Entreprise (Recruteur)</h4>
                                    <p>{viewRecruteur.nom_recruteur || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Numéro IFU (Entreprise)</h4>
                                    <p>{viewRecruteur.numero_ifu || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Téléphone</h4>
                                    <p>{viewRecruteur.telephone || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-muted-foreground">Adresse</h4>
                                <p>{viewRecruteur.adresse || '-'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Statut actuel</h4>
                                    <Badge variant={getStatusBadgeVariant(viewRecruteur.status)} className="mt-1">
                                        {getStatusLabel(viewRecruteur.status)}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-muted-foreground">Créé le</h4>
                                    <p>{new Date(viewRecruteur.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
