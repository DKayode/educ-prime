import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Briefcase, Plus, Pencil, Trash2, Loader2, Search, Eye } from "lucide-react";
import { opportunitesService, type Opportunite, type OpportuniteType } from "@/lib/services/opportunites.service";
import { fichiersService } from "@/lib/services/fichiers.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OpportuniteFormData {
    titre: string;
    type: OpportuniteType;
    organisme?: string;
    lieu?: string;
    date_limite?: string;
    image?: string;
    lien_postuler?: string;
    actif: boolean;
}

export default function Opportunites() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingOpportunite, setEditingOpportunite] = useState<Opportunite | null>(null);
    const [searchTitre, setSearchTitre] = useState("");
    const [searchType, setSearchType] = useState<OpportuniteType | "ALL">("ALL");
    const [searchLieu, setSearchLieu] = useState("");
    const [searchOrganisme, setSearchOrganisme] = useState("");

    const debouncedTitre = useDebounce(searchTitre, 500);
    const debouncedLieu = useDebounce(searchLieu, 500);
    const debouncedOrganisme = useDebounce(searchOrganisme, 500);

    const [formData, setFormData] = useState<OpportuniteFormData>({
        titre: "",
        type: "Bourses",
        organisme: "",
        lieu: "",
        date_limite: "",
        image: "",
        lien_postuler: "",
        actif: true,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: opportunitesResponse, isLoading, isPlaceholderData } = useQuery({
        queryKey: ["opportunites", debouncedTitre, searchType, debouncedLieu, debouncedOrganisme],
        queryFn: () => opportunitesService.getAll({
            titre: debouncedTitre || undefined,
            type: searchType === "ALL" ? undefined : searchType,
            lieu: debouncedLieu || undefined,
            organisme: debouncedOrganisme || undefined
        }),
        placeholderData: keepPreviousData,
    });
    const opportunites = opportunitesResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: OpportuniteFormData) => opportunitesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", type: "Bourses", organisme: "", lieu: "", date_limite: "", image: "", lien_postuler: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Opportunité créée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<OpportuniteFormData> }) =>
            opportunitesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunites"] });
            setIsEditDialogOpen(false);
            setEditingOpportunite(null);
            toast({ title: "Succès", description: "Opportunité mise à jour avec succès" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => opportunitesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Opportunité supprimée avec succès" });
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
            // Step 1: Create entity without image
            const createdOpportunite = await opportunitesService.create({
                ...formData,
                image: formData.image || undefined,
                lien_postuler: formData.lien_postuler || undefined,
            });

            // Step 2: Upload file if selected
            if (selectedFile && createdOpportunite.id) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedFile,
                        type: 'OPPORTUNITE',
                        entityId: createdOpportunite.id,
                        entitySubtype: formData.type.toLowerCase(), // 'bourses' or 'stages'
                    });

                    // Step 3: Update entity with image URL
                    await opportunitesService.update(createdOpportunite.id.toString(), {
                        image: uploadResult.url,
                    });
                } catch (uploadError: any) {
                    // Rollback: Delete the created entity
                    await opportunitesService.delete(createdOpportunite.id.toString());
                    throw new Error("Échec de l'upload de l'image: " + (uploadError.message || "Erreur inconnue"));
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["opportunites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", type: "Bourses", organisme: "", lieu: "", date_limite: "", image: "", lien_postuler: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Opportunité créée avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOpportunite) return;
        setIsUploading(true);

        try {
            // Step 1: Update entity fields
            await opportunitesService.update(editingOpportunite.id.toString(), {
                titre: editingOpportunite.titre,
                type: editingOpportunite.type,
                organisme: editingOpportunite.organisme,
                lieu: editingOpportunite.lieu,
                date_limite: editingOpportunite.date_limite,
                lien_postuler: editingOpportunite.lien_postuler || undefined,
                image: editingOpportunite.image || undefined,
                actif: editingOpportunite.actif
            });

            // Step 2: Upload file if selected
            if (selectedFile) {
                // Keep track of old image URL for deletion
                const oldImageUrl = editingOpportunite.image;

                const uploadResult = await fichiersService.uploadImage({
                    file: selectedFile,
                    type: 'OPPORTUNITE',
                    entityId: editingOpportunite.id,
                    entitySubtype: editingOpportunite.type.toLowerCase(),
                });

                // Step 3: Update with new image URL
                await opportunitesService.update(editingOpportunite.id.toString(), {
                    image: uploadResult.url
                });

                // Step 4: Delete old file if it existed
                if (oldImageUrl) {
                    try {
                        await fichiersService.deleteFile(oldImageUrl);
                        console.log("Deleted old file:", oldImageUrl);
                    } catch (deleteError) {
                        console.error("Failed to delete old file:", deleteError);
                    }
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["opportunites"] });
            setIsEditDialogOpen(false);
            setEditingOpportunite(null);
            setSelectedFile(null);
            toast({ title: "Succès", description: "Opportunité mise à jour avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePreview = async (item: Opportunite) => {
        try {
            setPreviewTitle(item.titre);
            setIsPreviewOpen(true);
            const blob = await opportunitesService.download(item.id);
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
                        <Briefcase className="h-8 w-8" />
                        Opportunités
                    </h1>
                    <p className="text-muted-foreground">Gérer les bourses et stages</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter une opportunité
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Créer une opportunité</DialogTitle>
                                <DialogDescription>Ajouter une nouvelle bourse ou stage</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="titre">Titre *</Label>
                                    <Input id="titre" value={formData.titre} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="type">Type *</Label>
                                        <Select value={formData.type} onValueChange={(value: OpportuniteType) => setFormData({ ...formData, type: value })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bourses">Bourses</SelectItem>
                                                <SelectItem value="Stages">Stages</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="organisme">Organisme</Label>
                                        <Input id="organisme" value={formData.organisme} onChange={(e) => setFormData({ ...formData, organisme: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="lieu">Lieu (Pays/Ville)</Label>
                                        <Input id="lieu" value={formData.lieu} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="date_limite">Date limite</Label>
                                        <Input id="date_limite" type="date" value={formData.date_limite} onChange={(e) => setFormData({ ...formData, date_limite: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="image">Image</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="file"
                                            type="file"
                                            accept="image/*"
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
                                <div className="grid gap-2">
                                    <Label htmlFor="lien_postuler">Lien pour postuler</Label>
                                    <Input id="lien_postuler" value={formData.lien_postuler} onChange={(e) => setFormData({ ...formData, lien_postuler: e.target.value })} />
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
                    <CardTitle>Liste des opportunités</CardTitle>
                    <CardDescription>
                        {opportunites.length} opportunité{opportunites.length > 1 ? "s" : ""}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Titre..."
                                    value={searchTitre}
                                    onChange={(e) => setSearchTitre(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={searchType} onValueChange={(val: OpportuniteType | "ALL") => setSearchType(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tous types</SelectItem>
                                    <SelectItem value="Bourses">Bourses</SelectItem>
                                    <SelectItem value="Stages">Stages</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder="Lieu..."
                                value={searchLieu}
                                onChange={(e) => setSearchLieu(e.target.value)}
                            />
                            <Input
                                placeholder="Organisme..."
                                value={searchOrganisme}
                                onChange={(e) => setSearchOrganisme(e.target.value)}
                            />
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {opportunites.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Aucune opportunité trouvée.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Organisme</TableHead>
                                    <TableHead>Lieu</TableHead>
                                    <TableHead>Date limite</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {opportunites.map((opp) => (
                                    <TableRow key={opp.id}>
                                        <TableCell className="font-medium">{opp.titre}</TableCell>
                                        <TableCell><Badge variant={opp.type === "Bourses" ? "default" : "secondary"}>{opp.type}</Badge></TableCell>
                                        <TableCell>{opp.organisme || "—"}</TableCell>
                                        <TableCell>{opp.lieu || "—"}</TableCell>
                                        <TableCell>{opp.date_limite ? new Date(opp.date_limite).toLocaleDateString('fr-FR') : "—"}</TableCell>
                                        <TableCell><Badge variant={opp.actif ? "default" : "secondary"}>{opp.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handlePreview(opp)}
                                                    title="Visualiser"
                                                    disabled={!opp.image}
                                                >
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingOpportunite(opp); setIsEditDialogOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(opp.id)}>
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
                        <DialogHeader><DialogTitle>Modifier l'opportunité</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Titre *</Label>
                                <Input value={editingOpportunite?.titre || ""} onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, titre: e.target.value } : null)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Type *</Label>
                                    <Select
                                        value={editingOpportunite?.type}
                                        onValueChange={(value: OpportuniteType) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, type: value } : null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bourses">Bourses</SelectItem>
                                            <SelectItem value="Stages">Stages</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Organisme</Label>
                                    <Input value={editingOpportunite?.organisme || ""} onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, organisme: e.target.value } : null)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Lieu</Label>
                                    <Input value={editingOpportunite?.lieu || ""} onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, lieu: e.target.value } : null)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Date limite</Label>
                                    <Input type="date" value={editingOpportunite?.date_limite ? new Date(editingOpportunite.date_limite).toISOString().split('T')[0] : ""} onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, date_limite: e.target.value } : null)} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Lien pour postuler</Label>
                                <Input value={editingOpportunite?.lien_postuler || ""} onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, lien_postuler: e.target.value } : null)} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Image (Laisser vide pour conserver l'actuelle)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
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
                            <div className="flex items-center gap-2">
                                <Label htmlFor="edit-actif">Actif</Label>
                                <input
                                    type="checkbox"
                                    id="edit-actif"
                                    checked={editingOpportunite?.actif || false}
                                    onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, actif: e.target.checked } : null)}
                                    className="h-4 w-4"
                                />
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
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cette opportunité ?</AlertDialogDescription>
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
