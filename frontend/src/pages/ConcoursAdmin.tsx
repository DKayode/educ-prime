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
import { concoursService, Concours } from "@/lib/services/concours.service";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ConcoursAdmin() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['admin-concours-pending', page, limit],
        queryFn: () => concoursService.getPending({ page, limit }),
    });

    const concours = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: 'approved' | 'declined' }) =>
            concoursService.updateStatus(id, status),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-concours-pending"] });
            toast({
                title: variables.status === 'approved' ? "Concours approuvé" : "Concours refusé",
                description: variables.status === 'approved'
                    ? "Le concours a été approuvé et est désormais visible."
                    : "Le concours a été refusé. L'auteur en sera informé.",
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

    const submitterName = (c: Concours) => {
        const u = c.soumis_par;
        if (!u) return '-';
        const name = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
        return name || u.email || '-';
    };

    const handleLimitChange = (val: string) => {
        setLimit(parseInt(val));
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Concours en attente</h1>
                    <p className="text-muted-foreground">Approuvez ou refusez les concours soumis par les utilisateurs</p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Concours en attente d'approbation</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
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
                            Erreur lors du chargement des concours
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Titre officiel</TableHead>
                                        <TableHead>Structure</TableHead>
                                        <TableHead>Titre / Poste</TableHead>
                                        <TableHead>Année</TableHead>
                                        <TableHead>Soumis par</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {concours.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                Aucun concours en attente.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        concours.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium max-w-[220px] truncate" title={c.titre}>
                                                    {c.titre}
                                                </TableCell>
                                                <TableCell>{c.structure?.nom || '-'}</TableCell>
                                                <TableCell>{c.titre_ref?.nom || '-'}</TableCell>
                                                <TableCell>{c.annee ?? '-'}</TableCell>
                                                <TableCell>{submitterName(c)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">En Attente</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleUpdateStatus(c.id, 'approved')}
                                                            title="Approuver"
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleUpdateStatus(c.id, 'declined')}
                                                            title="Refuser"
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <XCircle className="h-4 w-4 text-destructive" />
                                                        </Button>
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
