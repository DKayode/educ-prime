import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { GraduationCap, Plus, Pencil, Trash2, Loader2, Search, Eye } from "lucide-react";
import { concoursService, type Concours } from "@/lib/services/concours.service";
import { fichiersService } from "@/lib/services/fichiers.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConcoursFormData {
    titre: string;
    url?: string;
    annee?: string; // string for input, converted to number
    lieu?: string;
    nombre_page?: number;
}

export default function Concours() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<Concours | null>(null);
    const [search, setSearch] = useState("");
    const [searchAnnee, setSearchAnnee] = useState<string>("ALL");

    const debouncedSearch = useDebounce(search, 500);

    const [availableAnnees, setAvailableAnnees] = useState<number[]>([]);

    const [formData, setFormData] = useState<ConcoursFormData>({
        titre: "",
        url: "",
        annee: "",
        lieu: "",
        nombre_page: 0,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch available years
    useQuery({
        queryKey: ["concours-annees"],
        queryFn: () => concoursService.getAnnees(),
    });

    // We can just fetch years inside the component if we want, or use the query result.
    // Let's reload years when opening filter or on mount.
    // Actually, react-query is cleaner. Let's assume we get the list.
    const { data: anneesList } = useQuery({
        queryKey: ["concours-annees"],
        queryFn: async () => {
            return await concoursService.getAnnees();
        }
    });

    const { data: itemsResponse, isLoading, isPlaceholderData } = useQuery({
        queryKey: ["concours", debouncedSearch, searchAnnee],
        queryFn: () => concoursService.getAll({
            search: debouncedSearch || undefined,
            annee: searchAnnee !== "ALL" ? parseInt(searchAnnee) : undefined
        }),
        placeholderData: keepPreviousData,
    });
    const items = itemsResponse?.data || [];



    const createMutation = useMutation({
        mutationFn: (data: ConcoursFormData) => concoursService.create({
            ...data,
            annee: data.annee ? parseInt(data.annee) : undefined,
            url: data.url || undefined
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours"] });
            queryClient.invalidateQueries({ queryKey: ["concours-annees"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", url: "", annee: "", lieu: "", nombre_page: 0 });
            setIsEditDialogOpen(false);
            setEditingItem(null);
            toast({ title: "Succès", description: "Concours/Examen mis à jour avec succès" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Concours> }) => concoursService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours"] });
            queryClient.invalidateQueries({ queryKey: ["concours-annees"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsEditDialogOpen(false);
            setEditingItem(null);
            toast({ title: "Succès", description: "Concours mis à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => concoursService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Concours/Examen supprimé avec succès" });
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            // Step 1: Create entity without file URL
            const createdItem = await concoursService.create({
                ...formData,
                annee: formData.annee ? parseInt(formData.annee) : undefined,
                url: formData.url || undefined,
            });

            // Step 2: Upload file if selected
            if (selectedFile && createdItem.id) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedFile,
                        type: 'CONCOURS',
                        entityId: createdItem.id,
                        entitySubtype: 'document',
                    });

                    // Step 3: Update entity with file URL
                    await concoursService.update(createdItem.id.toString(), {
                        url: uploadResult.url,
                    });
                } catch (uploadError: any) {
                    // Rollback
                    await concoursService.delete(createdItem.id.toString());
                    throw new Error("Échec de l'upload du fichier: " + (uploadError.message || "Erreur inconnue"));
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["concours"] });
            queryClient.invalidateQueries({ queryKey: ["concours-annees"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", url: "", annee: "", lieu: "", nombre_page: 0 });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Concours créé avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        setIsUploading(true);

        try {
            // Step 1: Update entity fields
            await concoursService.update(editingItem.id.toString(), {
                titre: editingItem.titre,
                lieu: editingItem.lieu,
                annee: editingItem.annee,
                nombre_page: editingItem.nombre_page,
                url: editingItem.url || undefined
            });

            // Step 2: Upload file if selected
            if (selectedFile) {
                // Keep track of old URL for deletion
                const oldUrl = editingItem.url;

                const uploadResult = await fichiersService.uploadImage({
                    file: selectedFile,
                    type: 'CONCOURS',
                    entityId: editingItem.id,
                    entitySubtype: 'document',
                });

                // Step 3: Update with new file URL
                await concoursService.update(editingItem.id.toString(), {
                    url: uploadResult.url
                });

                // Step 4: Delete old file if it existed
                if (oldUrl) {
                    try {
                        await fichiersService.deleteFile(oldUrl);
                        console.log("Deleted old file:", oldUrl);
                    } catch (deleteError) {
                        console.error("Failed to delete old file:", deleteError);
                    }
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["concours"] });
            queryClient.invalidateQueries({ queryKey: ["concours-annees"] });
            setIsEditDialogOpen(false);
            setEditingItem(null);
            setSelectedFile(null);
            toast({ title: "Succès", description: "Concours mis à jour avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePreview = async (item: Concours) => {
        try {
            setPreviewTitle(item.titre);
            setIsPreviewOpen(true);
            const blob = await concoursService.download(item.id);
            const url = window.URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (error) {
            console.error("Preview error:", error);
            toast({ title: "Erreur", description: "Erreur lors du chargement de l'aperçu", variant: "destructive" });
            setIsPreviewOpen(false);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    if (isLoading && !isPlaceholderData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <GraduationCap className="h-8 w-8" />
                        Concours
                    </h1>
                    <p className="text-muted-foreground">Gérer les concours</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Créer un concours</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="titre">Titre *</Label>
                                    <Input id="titre" value={formData.titre} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="annee">Année</Label>
                                        <Input id="annee" type="number" placeholder="YYYY" value={formData.annee} onChange={(e) => setFormData({ ...formData, annee: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lieu">Lieu</Label>
                                        <Input id="lieu" value={formData.lieu} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="nombre_page">Nombre de pages</Label>
                                    <Input id="nombre_page" type="number" value={formData.nombre_page} onChange={(e) => setFormData({ ...formData, nombre_page: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="url">Fichier (URL ou Upload)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="file"
                                            type="file"
                                            // accept=".pdf,.doc,.docx" // Assuming document or image? User said "image into url (firebase url associate to this entity file)", but also "number of page of documents". Sounds like PDF/Doc.
                                            // Let's keep it generic or image/* if it was mostly image? But typically Concours are docs. I'll stick to what uploadImage supports or generic.
                                            onChange={handleFileChange}
                                            className="flex-1"
                                        />
                                        {selectedFile && (
                                            <Badge variant="secondary" className="self-center">
                                                {selectedFile.name}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending || isUploading}>
                                    {createMutation.isPending || isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? "Upload..." : "Création..."}</> : "Créer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des concours</CardTitle>
                    <CardDescription>
                        {items.length} élément{items.length > 1 ? "s" : ""}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <div className="relative md:col-span-3">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher (Titre, Lieu)..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={searchAnnee} onValueChange={setSearchAnnee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Année" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Toutes années</SelectItem>
                                    {anneesList?.map((annee) => (
                                        <SelectItem key={annee} value={annee.toString()}>{annee}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Aucun concours/examen trouvé.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Année</TableHead>
                                    <TableHead>Lieu</TableHead>
                                    <TableHead>Pages</TableHead>
                                    <TableHead>Téléch.</TableHead>

                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.titre}</TableCell>
                                        <TableCell>{item.annee || "—"}</TableCell>
                                        <TableCell>{item.lieu || "—"}</TableCell>
                                        <TableCell>{item.nombre_page}</TableCell>
                                        <TableCell>{item.nombre_telechargements}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handlePreview(item)} title="Visualiser" disabled={!item.url}>
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsEditDialogOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader><DialogTitle>Modifier</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Titre *</Label>
                                <Input value={editingItem?.titre || ""} onChange={(e) => setEditingItem(editingItem ? { ...editingItem, titre: e.target.value } : null)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Lieu</Label>
                                <Input value={editingItem?.lieu || ""} onChange={(e) => setEditingItem(editingItem ? { ...editingItem, lieu: e.target.value } : null)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Année</Label>
                                <Input type="number" value={editingItem?.annee || ""} onChange={(e) => setEditingItem(editingItem ? { ...editingItem, annee: parseInt(e.target.value) || undefined } : null)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Nombre de pages</Label>
                                <Input type="number" value={editingItem?.nombre_page || 0} onChange={(e) => setEditingItem(editingItem ? { ...editingItem, nombre_page: parseInt(e.target.value) || 0 } : null)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Fichier (Laisser vide pour conserver l'actuel)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="flex-1"
                                    />
                                    {selectedFile && (
                                        <Badge variant="secondary" className="self-center">
                                            {selectedFile.name}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise à jour...</> : "Mettre à jour"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cet élément ?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId.toString())} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suppression...</> : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && closePreview()}>
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>{previewTitle}</DialogTitle>
                        <DialogDescription>
                            Aperçu du fichier
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 h-full min-h-[60vh] w-full rounded-md border bg-muted/50">
                        {previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded-md"
                                title="Aperçu du fichier"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
