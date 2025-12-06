import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { publicitesService, type Publicite } from "@/lib/services/publicites.service";
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

interface PubliciteFormData {
    titre: string;
    image_video?: string;
    lien?: string;
    ordre: number;
    actif: boolean;
}

export default function Publicites() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingPublicite, setEditingPublicite] = useState<Publicite | null>(null);
    const [formData, setFormData] = useState<PubliciteFormData>({
        titre: "",
        image_video: "",
        lien: "",
        ordre: 0,
        actif: true,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: publicites = [], isLoading } = useQuery({
        queryKey: ["publicites"],
        queryFn: () => publicitesService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: PubliciteFormData) => publicitesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["publicites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", image_video: "", lien: "", ordre: 0, actif: true });
            setSelectedFile(null);
            toast({
                title: "Succès",
                description: "Publicité créée avec succès",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la création de la publicité",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<PubliciteFormData> }) =>
            publicitesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["publicites"] });
            setIsEditDialogOpen(false);
            setEditingPublicite(null);
            toast({
                title: "Succès",
                description: "Publicité mise à jour avec succès",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la mise à jour de la publicité",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => publicitesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["publicites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setDeleteId(null);
            toast({
                title: "Succès",
                description: "Publicité supprimée avec succès",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la suppression de la publicité",
                variant: "destructive",
            });
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

        let createdEntityId: number | null = null;

        try {
            // Step 1: Create entity without image
            const createdPublicite = await publicitesService.create({
                ...formData,
                image_video: formData.image_video || undefined,
            });
            createdEntityId = createdPublicite.id;

            // Step 2: Upload file if selected
            if (selectedFile && createdPublicite.id) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedFile,
                        type: 'PUBLICITE',
                        entityId: createdPublicite.id,
                    });

                    // Step 3: Update entity with image URL
                    await publicitesService.update(createdPublicite.id.toString(), {
                        image_video: uploadResult.url,
                    });
                } catch (uploadError: any) {
                    // Rollback: Delete the created entity
                    await publicitesService.delete(createdPublicite.id.toString());
                    throw new Error("Échec de l'upload de l'image: " + (uploadError.message || "Erreur inconnue"));
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["publicites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", image_video: "", lien: "", ordre: 0, actif: true });
            setSelectedFile(null);
            toast({
                title: "Succès",
                description: "Publicité créée avec succès",
            });
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la création de la publicité",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPublicite) {
            updateMutation.mutate({
                id: editingPublicite.id.toString(),
                data: {
                    titre: editingPublicite.titre,
                    image_video: editingPublicite.image_video,
                    lien: editingPublicite.lien,
                    ordre: editingPublicite.ordre,
                    actif: editingPublicite.actif,
                },
            });
        }
    };

    const openEditDialog = (publicite: Publicite) => {
        setEditingPublicite(publicite);
        setIsEditDialogOpen(true);
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
                        <Megaphone className="h-8 w-8" />
                        Publicités
                    </h1>
                    <p className="text-muted-foreground">Gérer les publicités de la plateforme</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter une publicité
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Créer une publicité</DialogTitle>
                                <DialogDescription>
                                    Ajouter une nouvelle publicité
                                </DialogDescription>
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
                                    <Label htmlFor="image_video">Image/Vidéo</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="file"
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                            className="flex-1"
                                        />
                                        {selectedFile && (
                                            <Badge variant="secondary" className="self-center">
                                                {selectedFile.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Ou entrez une URL manuellement ci-dessous
                                    </p>
                                    <Input
                                        id="image_video"
                                        placeholder="https://..."
                                        value={formData.image_video}
                                        onChange={(e) => setFormData({ ...formData, image_video: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lien">Lien</Label>
                                    <Input
                                        id="lien"
                                        value={formData.lien}
                                        onChange={(e) => setFormData({ ...formData, lien: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="ordre">Ordre</Label>
                                    <Input
                                        id="ordre"
                                        type="number"
                                        value={formData.ordre}
                                        onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) })}
                                    />
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
                    <CardTitle>Liste des publicités</CardTitle>
                    <CardDescription>
                        {publicites.length} publicité{publicites.length > 1 ? "s" : ""} enregistrée
                        {publicites.length > 1 ? "s" : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {publicites.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Aucune publicité trouvée. Créez-en une pour commencer.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Ordre</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {publicites.map((publicite) => (
                                    <TableRow key={publicite.id}>
                                        <TableCell className="font-medium">{publicite.titre}</TableCell>
                                        <TableCell>{publicite.ordre}</TableCell>
                                        <TableCell>
                                            <Badge variant={publicite.actif ? "default" : "secondary"}>
                                                {publicite.actif ? "Actif" : "Inactif"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(publicite)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(publicite.id)}
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

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle>Modifier la publicité</DialogTitle>
                            <DialogDescription>Mettre à jour les informations de la publicité</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-titre">Titre *</Label>
                                <Input
                                    id="edit-titre"
                                    value={editingPublicite?.titre || ""}
                                    onChange={(e) =>
                                        setEditingPublicite(
                                            editingPublicite ? { ...editingPublicite, titre: e.target.value } : null
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-image_video">URL Image/Vidéo</Label>
                                <Input
                                    id="edit-image_video"
                                    value={editingPublicite?.image_video || ""}
                                    onChange={(e) =>
                                        setEditingPublicite(
                                            editingPublicite ? { ...editingPublicite, image_video: e.target.value } : null
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-lien">Lien</Label>
                                <Input
                                    id="edit-lien"
                                    value={editingPublicite?.lien || ""}
                                    onChange={(e) =>
                                        setEditingPublicite(
                                            editingPublicite ? { ...editingPublicite, lien: e.target.value } : null
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-ordre">Ordre</Label>
                                <Input
                                    id="edit-ordre"
                                    type="number"
                                    value={editingPublicite?.ordre || 0}
                                    onChange={(e) =>
                                        setEditingPublicite(
                                            editingPublicite ? { ...editingPublicite, ordre: parseInt(e.target.value) } : null
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? (
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
                            Êtes-vous sûr de vouloir supprimer cette publicité ? Cette action est irréversible.
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
        </div>
    );
}
