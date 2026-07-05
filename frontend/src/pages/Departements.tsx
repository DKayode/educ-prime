import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { departementsService, type Departement, type ImportSummary } from "@/lib/services/departements.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/use-debounce";

interface DepartementFormData {
    nom: string;
    code: string;
}

// Toast the {created, skipped, errors} summary; surface the first few error lines.
function toastImportSummary(toast: ReturnType<typeof useToast>["toast"], summary: ImportSummary) {
    toast({
        title: "Import terminé",
        description: `${summary.created} créé(s), ${summary.skipped} ignoré(s), ${summary.errors.length} erreur(s)`,
    });
    if (summary.errors.length > 0) {
        const preview = summary.errors.slice(0, 5).map((e) => `Ligne ${e.line}: ${e.reason}`).join("\n");
        const more = summary.errors.length > 5 ? `\n… +${summary.errors.length - 5} autre(s)` : "";
        toast({ title: "Lignes ignorées", description: preview + more, variant: "destructive" });
    }
}

export default function Departements() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editing, setEditing] = useState<Departement | null>(null);
    const [formData, setFormData] = useState<DepartementFormData>({ nom: "", code: "" });
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: response, isLoading } = useQuery({
        queryKey: ["departements", debouncedSearch, page, limit],
        queryFn: () => departementsService.getAll({ search: debouncedSearch, page, limit }),
    });
    const departements = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const createMutation = useMutation({
        mutationFn: (data: DepartementFormData) => departementsService.create({ nom: data.nom, code: data.code || undefined }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departements"] });
            setIsCreateDialogOpen(false);
            setFormData({ nom: "", code: "" });
            toast({ title: "Succès", description: "Département créé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<DepartementFormData> }) => departementsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departements"] });
            setIsEditDialogOpen(false);
            setEditing(null);
            toast({ title: "Succès", description: "Département mis à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => departementsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departements"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Département supprimé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la suppression", variant: "destructive" });
        },
    });

    const importMutation = useMutation({
        mutationFn: (file: File) => departementsService.importCsv(file),
        onSuccess: (summary) => {
            queryClient.invalidateQueries({ queryKey: ["departements"] });
            toastImportSummary(toast, summary);
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de l'import CSV", variant: "destructive" });
        },
    });

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) importMutation.mutate(file);
        e.target.value = ""; // allow re-selecting the same file
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        updateMutation.mutate({ id: editing.id, data: { nom: editing.nom, code: editing.code || "" } });
    };

    const openEditDialog = (item: Departement) => {
        setEditing(item);
        setIsEditDialogOpen(true);
    };

    const openCreateDialog = () => {
        setFormData({ nom: "", code: "" });
        setIsCreateDialogOpen(true);
    };

    if (isLoading) {
        return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <MapPin className="h-8 w-8" />
                        Départements
                    </h1>
                    <p className="text-muted-foreground">Gérer les départements (par pays)</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher..."
                            className="pl-8 w-[250px]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
                    <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                        {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importer CSV
                    </Button>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={openCreateDialog}><Plus className="h-4 w-4" /> Ajouter</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Créer un département</DialogTitle>
                                    <DialogDescription>Ajouter un nouveau département</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nom">Nom *</Label>
                                        <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="code">Code</Label>
                                        <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer"}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des départements</CardTitle>
                    <CardDescription>{departements.length} département{departements.length > 1 ? "s" : ""} sur cette page</CardDescription>
                </CardHeader>
                <CardContent>
                    {departements.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucun département trouvé.</div> :
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departements.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.nom}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.code || "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    }
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">Page {page} sur {totalPages}</div>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-[500px]">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle>Modifier le département</DialogTitle>
                        </DialogHeader>
                        {editing && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Nom</Label>
                                    <Input value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Code</Label>
                                    <Input value={editing.code || ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Mettre à jour"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Supprimer ce département supprimera aussi ses villes. Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
