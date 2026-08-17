import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { villesService, type Ville } from "@/lib/services/villes.service";
import { departementsService, type ImportSummary } from "@/lib/services/departements.service";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/permissions";

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

const ALL = "all";

export default function Villes() {
    const { hasPermission } = useAuth();
    const canCreateReferential = hasPermission(Permission.REFERENTIALS_CREATE);
    const canUpdateReferential = hasPermission(Permission.REFERENTIALS_UPDATE);
    const canDeleteReferential = hasPermission(Permission.REFERENTIALS_DELETE);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Ville | null>(null);
    const [editDeptId, setEditDeptId] = useState<string>("");
    const [createNom, setCreateNom] = useState("");
    const [createDeptId, setCreateDeptId] = useState<string>("");
    const [filterDeptId, setFilterDeptId] = useState<string>(ALL);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Départements for the filter + create selects (scoped to current country by api)
    const { data: deptResponse } = useQuery({
        queryKey: ["departements", "all-for-select"],
        queryFn: () => departementsService.getAll({ page: 1, limit: 1000 }),
    });
    const departements = deptResponse?.data || [];

    const departementId = filterDeptId === ALL ? undefined : filterDeptId;
    const { data: response, isLoading } = useQuery({
        queryKey: ["villes", debouncedSearch, page, limit, departementId],
        queryFn: () => villesService.getAll({ search: debouncedSearch, page, limit, departement_id: departementId }),
    });
    const villes = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const createMutation = useMutation({
        mutationFn: (data: { nom: string; departement_id: string }) => villesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["villes"] });
            setIsCreateDialogOpen(false);
            setCreateNom("");
            setCreateDeptId("");
            toast({ title: "Succès", description: "Ville créée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<{ nom: string; departement_id: string }> }) => villesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["villes"] });
            setIsEditDialogOpen(false);
            setEditing(null);
            toast({ title: "Succès", description: "Ville mise à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => villesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["villes"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Ville supprimée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la suppression", variant: "destructive" });
        },
    });

    const importMutation = useMutation({
        mutationFn: (file: File) => villesService.importCsv(file),
        onSuccess: (summary) => {
            queryClient.invalidateQueries({ queryKey: ["villes"] });
            toastImportSummary(toast, summary);
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de l'import CSV", variant: "destructive" });
        },
    });

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) importMutation.mutate(file);
        e.target.value = "";
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!createDeptId) {
            toast({ title: "Erreur", description: "Veuillez choisir un département", variant: "destructive" });
            return;
        }
        createMutation.mutate({ nom: createNom, departement_id: createDeptId });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        updateMutation.mutate({ id: editing.uuid, data: { nom: editing.nom, departement_id: editDeptId } });
    };

    const openEditDialog = (item: Ville) => {
        setEditing(item);
        setEditDeptId(item.departement?.uuid ?? "");
        setIsEditDialogOpen(true);
    };

    const openCreateDialog = () => {
        setCreateNom("");
        setCreateDeptId(departementId ?? "");
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
                        Villes
                    </h1>
                    <p className="text-muted-foreground">Gérer les villes (rattachées à un département)</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={filterDeptId} onValueChange={(v) => { setFilterDeptId(v); setPage(1); }}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Filtrer par département" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Tous les départements</SelectItem>
                            {departements.map((d) => (
                                <SelectItem key={d.uuid} value={d.uuid}>{d.nom}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher..."
                            className="pl-8 w-[200px]"
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
                            <Button className="gap-2" onClick={openCreateDialog} disabled={!canCreateReferential}><Plus className="h-4 w-4" /> Ajouter</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Créer une ville</DialogTitle>
                                    <DialogDescription>Choisir le département puis nommer la ville</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Département *</Label>
                                        <Select value={createDeptId} onValueChange={setCreateDeptId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choisir un département" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departements.map((d) => (
                                                    <SelectItem key={d.uuid} value={d.uuid}>{d.nom}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="nom">Nom de la ville *</Label>
                                        <Input id="nom" value={createNom} onChange={(e) => setCreateNom(e.target.value)} required />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={!canCreateReferential || createMutation.isPending}>{createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer"}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des villes</CardTitle>
                    <CardDescription>{villes.length} ville{villes.length > 1 ? "s" : ""} sur cette page</CardDescription>
                </CardHeader>
                <CardContent>
                    {villes.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucune ville trouvée.</div> :
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Département</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {villes.map((item) => (
                                    <TableRow key={item.uuid}>
                                        <TableCell className="font-medium">{item.nom}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.departement?.nom || "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} disabled={!canUpdateReferential}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.uuid)} disabled={!canDeleteReferential}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
                            <DialogTitle>Modifier la ville</DialogTitle>
                        </DialogHeader>
                        {editing && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Département *</Label>
                                    <Select value={editDeptId} onValueChange={setEditDeptId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir un département" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departements.map((d) => (
                                                <SelectItem key={d.uuid} value={d.uuid}>{d.nom}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nom de la ville</Label>
                                    <Input value={editing.nom} onChange={(e) => setEditing({ ...editing, nom: e.target.value })} required />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={!canUpdateReferential || updateMutation.isPending}>{updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Mettre à jour"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cette ville ? Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction disabled={!canDeleteReferential} onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
