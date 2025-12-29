import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Pencil, Trash2, Loader2, Eye } from "lucide-react";
import { evenementsService, type Evenement } from "@/lib/services/evenements.service";
import { fichiersService } from "@/lib/services/fichiers.service";
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

interface EvenementFormData {
    titre: string;
    description?: string;
    date?: string;
    lieu?: string;
    lien_inscription?: string;
    image?: string;
    actif: boolean;
}

export default function Evenements() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingEvenement, setEditingEvenement] = useState<Evenement | null>(null);
    const [formData, setFormData] = useState<EvenementFormData>({
        titre: "",
        description: "",
        date: "",
        lieu: "",
        lien_inscription: "",
        image: "",
        actif: true,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: evenementsResponse, isLoading } = useQuery({
        queryKey: ["evenements"],
        queryFn: () => evenementsService.getAll(),
    });
    const evenements = evenementsResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: EvenementFormData) => evenementsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evenements"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", description: "", date: "", lieu: "", lien_inscription: "", image: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Événement créé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<EvenementFormData> }) =>
            evenementsService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evenements"] });
            setIsEditDialogOpen(false);
            setEditingEvenement(null);
            toast({ title: "Succès", description: "Événement mis à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => evenementsService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evenements"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Événement supprimé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la suppression", variant: "destructive" });
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
            const createdEvenement = await evenementsService.create({
                ...formData,
                image: formData.image || undefined,
                lien_inscription: formData.lien_inscription || undefined,
                date: formData.date || undefined,
            });

            // Step 2: Upload file if selected
            if (selectedFile && createdEvenement.id) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedFile,
                        type: 'EVENEMENT',
                        entityId: createdEvenement.id,
                    });

                    // Step 3: Update entity with image URL
                    await evenementsService.update(createdEvenement.id.toString(), {
                        image: uploadResult.url,
                    });
                } catch (uploadError: any) {
                    // Rollback: Delete the created entity
                    await evenementsService.delete(createdEvenement.id.toString());
                    throw new Error("Échec de l'upload de l'image: " + (uploadError.message || "Erreur inconnue"));
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["evenements"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", description: "", date: "", lieu: "", lien_inscription: "", image: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Événement créé avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };



    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvenement) return;
        setIsUploading(true);

        try {
            // Step 1: Update entity fields
            await evenementsService.update(editingEvenement.id.toString(), {
                titre: editingEvenement.titre,
                description: editingEvenement.description,
                date: editingEvenement.date || undefined,
                lieu: editingEvenement.lieu,
                actif: editingEvenement.actif,
                image: editingEvenement.image || undefined,
                lien_inscription: editingEvenement.lien_inscription || undefined,
            });

            // Step 2: Upload file if selected
            if (selectedFile) {
                // Keep track of old image URL for deletion
                const oldImageUrl = editingEvenement.image;

                const uploadResult = await fichiersService.uploadImage({
                    file: selectedFile,
                    type: 'EVENEMENT',
                    entityId: editingEvenement.id,
                });

                // Step 3: Update with new image URL
                await evenementsService.update(editingEvenement.id.toString(), {
                    image: uploadResult.url
                });

                // Step 4: Delete old file if it existed
                if (oldImageUrl) {
                    try {
                        await fichiersService.deleteFile(oldImageUrl);
                        console.log("Deleted old file:", oldImageUrl);
                    } catch (deleteError) {
                        console.error("Failed to delete old file:", deleteError);
                        // Non-blocking error
                    }
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["evenements"] });
            setIsEditDialogOpen(false);
            setEditingEvenement(null);
            setSelectedFile(null); // Clear file
            toast({ title: "Succès", description: "Événement mis à jour avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePreview = async (item: Evenement) => {
        try {
            setPreviewTitle(item.titre);
            setIsPreviewOpen(true);
            const blob = await evenementsService.download(item.id);
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

    if (isLoading) {
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
                        <Calendar className="h-8 w-8" />
                        Événements
                    </h1>
                    <p className="text-muted-foreground">Gérer les événements de la plateforme</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter un événement
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Créer un événement</DialogTitle>
                                <DialogDescription>Ajouter un nouvel événement</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="titre">Titre *</Label>
                                    <Input
                                        id="titre"
                                        value={formData.titre}
                                        onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">Date et heure (Optionnel)</Label>
                                        <Input
                                            id="date"
                                            type="datetime-local"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lieu">Lieu</Label>
                                        <Input
                                            id="lieu"
                                            value={formData.lieu}
                                            onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lien_inscription">Lien d'inscription</Label>
                                    <Input
                                        id="lien_inscription"
                                        value={formData.lien_inscription}
                                        onChange={(e) => setFormData({ ...formData, lien_inscription: e.target.value })}
                                    />
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
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending || isUploading}>
                                    {createMutation.isPending || isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {isUploading ? "Upload..." : "Création..."}
                                        </>
                                    ) : (
                                        "Créer"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des événements</CardTitle>
                    <CardDescription>
                        {evenements.length} événement{evenements.length > 1 ? "s" : ""} enregistré{evenements.length > 1 ? "s" : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {evenements.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Aucun événement trouvé. Créez-en un pour commencer.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Lieu</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evenements.map((evenement) => (
                                    <TableRow key={evenement.id}>
                                        <TableCell className="font-medium">{evenement.titre}</TableCell>
                                        <TableCell>{evenement.date ? new Date(evenement.date).toLocaleDateString('fr-FR') : "—"}</TableCell>
                                        <TableCell>{evenement.lieu || "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={evenement.actif ? "default" : "secondary"}>
                                                {evenement.actif ? "Actif" : "Inactif"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handlePreview(evenement)}
                                                    title="Visualiser"
                                                    disabled={!evenement.image}
                                                >
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingEvenement(evenement);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(evenement.id)}
                                                >
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
                        <DialogHeader>
                            <DialogTitle>Modifier l'événement</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Titre *</Label>
                                <Input
                                    value={editingEvenement?.titre || ""}
                                    onChange={(e) => setEditingEvenement(editingEvenement ? { ...editingEvenement, titre: e.target.value } : null)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editingEvenement?.description || ""}
                                    onChange={(e) => setEditingEvenement(editingEvenement ? { ...editingEvenement, description: e.target.value } : null)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Date et heure (Optionnel)</Label>
                                    <Input
                                        type="datetime-local"
                                        value={editingEvenement?.date ? new Date(editingEvenement.date).toISOString().slice(0, 16) : ""}
                                        onChange={(e) => setEditingEvenement(editingEvenement ? { ...editingEvenement, date: e.target.value } : null)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Lieu</Label>
                                    <Input
                                        value={editingEvenement?.lieu || ""}
                                        onChange={(e) => setEditingEvenement(editingEvenement ? { ...editingEvenement, lieu: e.target.value } : null)}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Lien d'inscription</Label>
                                <Input
                                    value={editingEvenement?.lien_inscription || ""}
                                    onChange={(e) => setEditingEvenement(editingEvenement ? { ...editingEvenement, lien_inscription: e.target.value } : null)}
                                />
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
                                    checked={editingEvenement?.actif || false}
                                    onChange={(e) => setEditingEvenement(editingEvenement ? { ...editingEvenement, actif: e.target.checked } : null)}
                                    className="h-4 w-4"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isUploading}>
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Mise à jour...
                                    </>
                                ) : (
                                    "Mettre à jour"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId.toString())}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Suppression...
                                </>
                            ) : (
                                "Supprimer"
                            )}
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
