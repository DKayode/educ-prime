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
import { Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { epreuvesService } from "@/lib/services/epreuves.service";
import type { Epreuve } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const getStatusBadgeVariant = (status?: string) => {
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

const getStatusLabel = (status?: string) => {
    switch (status) {
        case 'active': return 'Actif';
        case 'approved': return 'Approuvé';
        case 'pending_approval': return 'En Attente';
        case 'declined': return 'Refusé';
        case 'inactive': return 'Inactif';
        default: return status || '-';
    }
};

// matiere → niveau_etude → filiere → etablissement (the full education chain).
const getChain = (epreuve: Epreuve) => {
    const matiere = epreuve.matiere;
    const etab = matiere?.niveau_etude?.filiere?.etablissement?.nom;
    const filiere = matiere?.niveau_etude?.filiere?.nom;
    const niveau = matiere?.niveau_etude?.nom;
    return [etab, filiere, niveau, matiere?.nom].filter(Boolean).join(" › ") || "-";
};

export default function EpreuvesApprobation() {
    const [selectedStatus, setSelectedStatus] = useState<string>("pending_approval");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['admin-epreuves', selectedStatus, page, limit],
        queryFn: () => epreuvesService.getAllAdmin({
            status: selectedStatus === "ALL" ? undefined : selectedStatus,
            page,
            limit,
        }),
    });

    const epreuves = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: 'approved' | 'declined' }) =>
            epreuvesService.updateStatus(id, status),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-epreuves"] });
            queryClient.invalidateQueries({ queryKey: ["epreuves"] });
            toast({
                title: "Statut mis à jour",
                description: variables.status === 'approved'
                    ? "L'épreuve a été approuvée. L'auteur a été notifié par email."
                    : "L'épreuve a été refusée. L'auteur a été notifié par email.",
            });
        },
        onError: (err: any) => {
            toast({
                title: "Erreur",
                description: err.message || "Échec de la mise à jour du statut",
                variant: "destructive",
            });
        },
    });

    const handleUpdateStatus = (id: number, status: 'approved' | 'declined') => {
        updateStatusMutation.mutate({ id, status });
    };

    const handleLimitChange = (val: string) => {
        setLimit(parseInt(val));
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Épreuves en attente</h1>
                    <p className="text-muted-foreground">Approuvez ou refusez les épreuves soumises par les utilisateurs</p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Liste des épreuves soumises</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) => {
                                    setSelectedStatus(value);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-[250px]">
                                    <SelectValue placeholder="Filtrer par statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending_approval">En Attente</SelectItem>
                                    <SelectItem value="approved">Approuvées</SelectItem>
                                    <SelectItem value="declined">Refusées</SelectItem>
                                    <SelectItem value="ALL">Tous les statuts</SelectItem>
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
                            Erreur lors du chargement des épreuves
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Titre</TableHead>
                                        <TableHead>Établissement › Filière › Niveau › Matière</TableHead>
                                        <TableHead>Année</TableHead>
                                        <TableHead>Auteur</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {epreuves.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Aucune épreuve trouvée.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        epreuves.map((epreuve) => (
                                            <TableRow key={epreuve.id}>
                                                <TableCell className="font-medium max-w-[200px] truncate" title={epreuve.titre}>
                                                    {epreuve.titre}
                                                </TableCell>
                                                <TableCell className="max-w-[280px] truncate text-muted-foreground" title={getChain(epreuve)}>
                                                    {getChain(epreuve)}
                                                </TableCell>
                                                <TableCell>
                                                    {epreuve.annee || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {epreuve.professeur ? `${epreuve.professeur.prenom} ${epreuve.professeur.nom}` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(epreuve.status)}>
                                                        {getStatusLabel(epreuve.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {epreuve.status === 'pending_approval' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(epreuve.id, 'approved')}
                                                                    title="Approuver"
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleUpdateStatus(epreuve.id, 'declined')}
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
        </div>
    );
}
