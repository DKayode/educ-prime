import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Pencil, Trash2, Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { categoriesService, type Category } from "@/lib/services/categories.service";
import { API_URL } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { Switch } from "@/components/ui/switch";

interface CategoryFormData {
    nom: string;
    description: string;
    icone?: string;
    is_active: boolean;
    ordre: number;
}

export default function Categories() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>({
        nom: "",
        description: "",
        icone: "",
        is_active: true,
        ordre: 0,
    });
    const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: categoriesResponse, isLoading } = useQuery({
        queryKey: ["categories", debouncedSearch, page, limit],
        queryFn: () => categoriesService.getAll({
            search: debouncedSearch,
            page,
            limit
        }),
    });
    const categories = categoriesResponse?.data || [];
    const totalPages = categoriesResponse?.totalPages || 1;

    // Safe object URL management
    useEffect(() => {
        if (!selectedIconFile) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedIconFile);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedIconFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedIconFile(e.target.files[0]);
        }
    };

    const createMutation = useMutation({
        mutationFn: async (data: CategoryFormData) => {
            // 1. Create Category first
            const created = await categoriesService.create(data);

            // 2. Upload Icon if selected
            if (selectedIconFile && created.id) {
                await categoriesService.uploadIcon(created.id.toString(), selectedIconFile);
            }
            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            setIsCreateDialogOpen(false);
            setFormData({ nom: "", description: "", icone: "", is_active: true, ordre: 0 });
            setSelectedIconFile(null);
            toast({ title: "Succès", description: "Catégorie créée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
            let updatedCategory;
            // 1. Update basic info
            if (Object.keys(data).length > 0) {
                updatedCategory = await categoriesService.update(id, data);
            }

            // 2. Upload Icon if selected
            if (selectedIconFile) {
                updatedCategory = await categoriesService.uploadIcon(id, selectedIconFile);
            }

            return updatedCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            setIsEditDialogOpen(false);
            setEditingCategory(null);
            setSelectedIconFile(null);
            toast({ title: "Succès", description: "Catégorie mise à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => categoriesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Catégorie supprimée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la suppression", variant: "destructive" });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        createMutation.mutate(formData, { onSettled: () => setIsUploading(false) });
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        setIsUploading(true);
        updateMutation.mutate({
            id: editingCategory.id.toString(),
            data: {
                nom: editingCategory.nom,
                description: editingCategory.description,
                icone: editingCategory.icone,
                is_active: editingCategory.is_active,
                ordre: editingCategory.ordre,
            }
        }, { onSettled: () => setIsUploading(false) });
    };

    const openEditDialog = (item: Category) => {
        setEditingCategory(item);
        setPreviewUrl(null);
        setSelectedIconFile(null);
        setIsEditDialogOpen(true);
    };

    const openCreateDialog = () => {
        setFormData({ nom: "", description: "", icone: "", is_active: true, ordre: 0 });
        setPreviewUrl(null);
        setSelectedIconFile(null);
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
                        <Layers className="h-8 w-8" />
                        Catégories
                    </h1>
                    <p className="text-muted-foreground">Gérer les catégories de parcours</p>
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
                            <Button className="gap-2" onClick={openCreateDialog}><Plus className="h-4 w-4" /> Ajouter</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[500px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Créer une catégorie</DialogTitle>
                                    <DialogDescription>Ajouter une nouvelle catégorie de parcours</DialogDescription>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="ordre">Ordre</Label>
                                            <Input
                                                id="ordre"
                                                type="number"
                                                value={formData.ordre}
                                                onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-8">
                                            <Switch
                                                checked={formData.is_active}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                            />
                                            <Label>Actif</Label>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="icon">Icône (Image)</Label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <Input
                                                    id="icon"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="cursor-pointer"
                                                />
                                            </div>
                                            {previewUrl && (
                                                <div className="relative h-10 w-10">
                                                    <img
                                                        src={previewUrl}
                                                        alt="Preview"
                                                        className="h-full w-full object-cover rounded"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-4 w-4 rounded-full p-0"
                                                        onClick={() => {
                                                            setSelectedIconFile(null);
                                                            setPreviewUrl(null);
                                                            // Reset input value if possible, or just ignore
                                                        }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isUploading}>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Créer"}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des catégories</CardTitle>
                    <CardDescription>{categories.length} catégorie{categories.length > 1 ? "s" : ""} enregistrée{categories.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                    {categories.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucune catégorie trouvée.</div> :
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Icône</TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Ordre</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.icone ? (
                                                <img
                                                    src={`${API_URL}/categories/${item.id}/icone`}
                                                    alt={item.nom}
                                                    className="h-10 w-10 object-contain rounded-md bg-muted/20"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                                                    <Layers className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.nom}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.slug}</TableCell>
                                        <TableCell>{item.ordre}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.is_active ? "default" : "secondary"}>
                                                {item.is_active ? "Actif" : "Inactif"}
                                            </Badge>
                                        </TableCell>
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
            {/* Pagination */}
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

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-[500px]">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle>Modifier la catégorie</DialogTitle>
                        </DialogHeader>
                        {editingCategory && (
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Nom</Label>
                                    <Input value={editingCategory.nom} onChange={(e) => setEditingCategory({ ...editingCategory, nom: e.target.value })} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Description</Label>
                                    <Textarea value={editingCategory.description || ''} onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Ordre</Label>
                                        <Input
                                            type="number"
                                            value={editingCategory.ordre}
                                            onChange={(e) => setEditingCategory({ ...editingCategory, ordre: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-8">
                                        <Switch
                                            checked={editingCategory.is_active}
                                            onCheckedChange={(checked) => setEditingCategory({ ...editingCategory, is_active: checked })}
                                        />
                                        <Label>Actif</Label>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nouvelle Icône (Laissez vide pour conserver)</Label>
                                    <div className="flex items-center gap-4">
                                        {previewUrl ? (
                                            <div className="relative h-16 w-16">
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="h-full w-full object-contain rounded-md border"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 p-0"
                                                    onClick={() => {
                                                        setSelectedIconFile(null);
                                                        setPreviewUrl(null);
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : editingCategory.icone ? (
                                            <div className="relative h-16 w-16">
                                                <img
                                                    src={`${API_URL}/categories/${editingCategory.id}/icone`}
                                                    alt="Current Icon"
                                                    className="h-full w-full object-contain rounded-md border"
                                                />
                                            </div>
                                        ) : null}
                                        <div className="flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={isUploading}>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Mettre à jour"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible et échouera si des parcours y sont associés.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId.toString())} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
