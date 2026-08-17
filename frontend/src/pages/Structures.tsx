import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { structureService } from "@/lib/services/structure.service";
import type { Structure } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
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

interface StructureFormData {
    nom: string;
    description: string;
}

export default function Structures() {
    const { hasPermission } = useAuth();
    const canCreateReferential = hasPermission(Permission.REFERENTIALS_CREATE);
    const canUpdateReferential = hasPermission(Permission.REFERENTIALS_UPDATE);
    const canDeleteReferential = hasPermission(Permission.REFERENTIALS_DELETE);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
    const [formData, setFormData] = useState<StructureFormData>({ nom: "", description: "" });
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: structuresResponse, isLoading } = useQuery({
        queryKey: ["structures", debouncedSearch, page, limit],
        queryFn: () => structureService.getAll({ search: debouncedSearch, page, limit }),
    });
    const structures = structuresResponse?.data || [];
    const totalPages = structuresResponse?.totalPages || 1;

    const createMutation = useMutation({
        mutationFn: (data: StructureFormData) => structureService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["structures"] });
            setIsCreateDialogOpen(false);
            setFormData({ nom: "", description: "" });
            toast({ title: "Succès", description: "Structure créée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<StructureFormData> }) => structureService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["structures"] });
            setIsEditDialogOpen(false);
            setEditingStructure(null);
            toast({ title: "Succès", description: "Structure mise à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => structureService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["structures"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Structure supprimée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la suppression", variant: "destructive" });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStructure) return;
        updateMutation.mutate({
            id: editingStructure.id,
            data: { nom: editingStructure.nom, description: editingStructure.description || "" },
        });
    };

    const openEditDialog = (item: Structure) => {
        setEditingStructure(item);
        setIsEditDialogOpen(true);
    };

    const openCreateDialog = () => {
        setFormData({ nom: "", description: "" });
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
                        <Building2 className="h-8 w-8" />
                        Structures
                    </h1>
                    <p className="text-muted-foreground">Gérer les structures organisatrices de concours</p>
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
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={openCreateDialog} disabled={!canCreateReferential}><Plus className="h-4 w-4" /> Ajouter</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Créer une structure</DialogTitle>
                                    <DialogDescription>Ajouter une nouvelle structure organisatrice</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nom">Nom *</Label>
                                        <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
                    <CardTitle>Liste des structures</CardTitle>
                    <CardDescription>{structures.length} structure{structures.length > 1 ? "s" : ""} enregistrée{structures.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                    {structures.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucune structure trouvée.</div> :
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {structures.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.nom}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.description || "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} disabled={!canUpdateReferential}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} disabled={!canDeleteReferential}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    }
                </CardContent>
            </Card>
            {/* Pagination */}
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
                            <DialogTitle>Modifier la structure</DialogTitle>
                        </DialogHeader>
                        {editingStructure && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Nom</Label>
                                    <Input value={editingStructure.nom} onChange={(e) => setEditingStructure({ ...editingStructure, nom: e.target.value })} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Description</Label>
                                    <Textarea value={editingStructure.description || ''} onChange={(e) => setEditingStructure({ ...editingStructure, description: e.target.value })} />
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
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cette structure ? Cette action est irréversible.</AlertDialogDescription>
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
