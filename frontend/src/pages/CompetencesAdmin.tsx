import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { competencesService, CompetenceItem } from "@/lib/services/competences.service";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompetencesAdmin() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedCompetence, setSelectedCompetence] = useState<CompetenceItem | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [formData, setFormData] = useState({
        nom: "",
        description: "",
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: competencesData, isLoading } = useQuery({
        queryKey: ["competences", page, limit],
        queryFn: () => competencesService.getAll({ page, limit }),
    });

    const createMutation = useMutation({
        mutationFn: competencesService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["competences"] });
            toast({ title: "Succès", description: "Compétence créée avec succès" });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: () => {
            toast({
                title: "Erreur",
                description: "Impossible de créer la compétence",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: { id: number; payload: Partial<CompetenceItem> }) =>
            competencesService.update(data.id, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["competences"] });
            toast({ title: "Succès", description: "Compétence modifiée avec succès" });
            setIsEditOpen(false);
            resetForm();
        },
        onError: () => {
            toast({
                title: "Erreur",
                description: "Impossible de modifier la compétence",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: competencesService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["competences"] });
            toast({ title: "Succès", description: "Compétence supprimée avec succès" });
        },
        onError: () => {
            toast({
                title: "Erreur",
                description: "Impossible de supprimer la compétence car elle est potentiellement liée à un prestataire ou une offre.",
                variant: "destructive",
            });
        },
    });

    const resetForm = () => {
        setFormData({ nom: "", description: "" });
        setSelectedCompetence(null);
    };

    const handleEditClick = (competence: CompetenceItem) => {
        setSelectedCompetence(competence);
        setFormData({
            nom: competence.nom,
            description: competence.description || "",
        });
        setIsEditOpen(true);
    };

    const handleLimitChange = (val: string) => {
        setLimit(parseInt(val));
        setPage(1);
    };

    const competences = competencesData?.data || [];
    const filteredCompetences = competences.filter((c) =>
        c.nom.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compétences</h1>
                    <p className="text-muted-foreground mt-2">
                        Gérez les compétences attachables aux prestataires et aux offres.
                    </p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle Compétence
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ajouter une compétence</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom <span className="text-red-500">*</span></label>
                                <Input
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    placeholder="Ex: Analyse de Données"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Description optionnelle..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Annuler
                            </Button>
                            <Button
                                disabled={!formData.nom || createMutation.isPending}
                                onClick={() => createMutation.mutate(formData)}
                            >
                                {createMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Créer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier la compétence</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nom <span className="text-red-500">*</span></label>
                                <Input
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                                Annuler
                            </Button>
                            <Button
                                disabled={!formData.nom || updateMutation.isPending}
                                onClick={() =>
                                    selectedCompetence &&
                                    updateMutation.mutate({
                                        id: selectedCompetence.id,
                                        payload: formData,
                                    })
                                }
                            >
                                {updateMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher une compétence..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
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

            <div className="bg-white rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom (Slug)</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    <p className="mt-2 text-sm text-muted-foreground">Chargement des compétences...</p>
                                </TableCell>
                            </TableRow>
                        ) : filteredCompetences.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                                    {searchQuery ? "Aucun résultat pour cette recherche." : "Aucune compétence trouvée."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCompetences.map((competence) => (
                                <TableRow key={competence.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{competence.nom}</span>
                                            <span className="text-xs text-muted-foreground font-mono">@{competence.slug}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">
                                        {competence.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleEditClick(competence)}
                                            >
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="icon" className="hover:bg-destructive hover:text-destructive-foreground">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cette action est irréversible. La compétence sera
                                                            définitivement supprimée et potentiellement détachée de toutes les offres et prestataires rattachés.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={() => deleteMutation.mutate(competence.id)}
                                                        >
                                                            Supprimer
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination footer */}
                {competencesData && competencesData.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/50">
                        <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{competencesData.total}</span> compétences au total
                            <span className="mx-1">•</span>
                            Page {competencesData.page} sur {competencesData.totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Précédent
                            </Button>
                            <div className="bg-white border rounded px-3 py-1 text-sm font-medium">
                                {page}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.min(competencesData.totalPages, prev + 1))}
                                disabled={page === competencesData.totalPages}
                            >
                                Suivant
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
