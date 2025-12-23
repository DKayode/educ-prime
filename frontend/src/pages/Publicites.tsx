import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Pencil, Trash2, Loader2, Upload, Search, Eye } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

interface PubliciteFormData {
    titre: string;
    image?: string;
    media?: string;
    type_media: 'Image' | 'Video';
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
        image: "",
        media: "",
        type_media: "Image",
        ordre: 0,
        actif: true,
    });
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: publicitesResponse, isLoading } = useQuery({
        queryKey: ["publicites", debouncedSearch],
        queryFn: () => publicitesService.getAll({ titre: debouncedSearch }),
    });
    const publicites = publicitesResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: PubliciteFormData) => publicitesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["publicites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", image: "", media: "", type_media: "Image", ordre: 0, actif: true });
            setSelectedImageFile(null);
            setSelectedMediaFile(null);
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
            setSelectedImageFile(null);
            setSelectedMediaFile(null);
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

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImageFile(e.target.files[0]);
        }
    };

    const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedMediaFile(e.target.files[0]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate YouTube URL if type is Video
        if (formData.type_media === 'Video' && formData.media) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(formData.media)) {
                toast({
                    title: "URL Invalide",
                    description: "Veuillez entrer une URL YouTube valide (youtube.com ou youtu.be)",
                    variant: "destructive"
                });
                return;
            }
        }

        setIsUploading(true);

        let createdEntityId: number | null = null;
        let uploadedImageUrl: string | null = null;
        let uploadedMediaUrl: string | null = null;

        try {
            // Step 1: Create entity without image
            const createdPublicite = await publicitesService.create({
                ...formData,
                image: formData.image || undefined,
                media: formData.media || undefined,
            });
            createdEntityId = createdPublicite.id;

            // Step 2: Upload Image (Cover) if selected
            if (selectedImageFile && createdPublicite.id) {
                const uploadResult = await fichiersService.uploadImage({
                    file: selectedImageFile,
                    type: 'PUBLICITE',
                    entityId: createdPublicite.id,
                    entitySubtype: 'image',
                });
                uploadedImageUrl = uploadResult.url;

                await publicitesService.update(createdPublicite.id.toString(), {
                    image: uploadResult.url,
                });
            }

            // Step 3: Upload Media (Content) if selected and type is Image
            if (formData.type_media === 'Image' && createdPublicite.id) {
                let mediaUrlToUpdate = undefined;

                if (selectedMediaFile) {
                    // Start upload for specific media file
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedMediaFile,
                        type: 'PUBLICITE',
                        entityId: createdPublicite.id,
                        entitySubtype: 'media',
                    });
                    mediaUrlToUpdate = uploadResult.url;
                    uploadedMediaUrl = uploadResult.url;
                } else if (selectedImageFile) {
                    // Reuse Cover Image file if no specific media file provided
                    // We must upload it again as 'media' subtype to satisfy path requirement: /publicite/:id/media/:filename
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedImageFile,
                        type: 'PUBLICITE',
                        entityId: createdPublicite.id,
                        entitySubtype: 'media',
                    });
                    mediaUrlToUpdate = uploadResult.url;
                    uploadedMediaUrl = uploadResult.url;
                }

                if (mediaUrlToUpdate) {
                    await publicitesService.update(createdPublicite.id.toString(), {
                        media: mediaUrlToUpdate,
                    });
                }
            } else if (formData.type_media === 'Video') {
                // Video URL already handled in Step 1
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["publicites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", image: "", media: "", type_media: "Image", ordre: 0, actif: true });
            setSelectedImageFile(null);
            setSelectedMediaFile(null);
            toast({
                title: "Succès",
                description: "Publicité créée avec succès",
            });
        } catch (error: any) {
            console.error("Creation failed, starting rollback...", error);

            // Rollback Logic
            try {
                // If we have an entity ID, delete it. 
                // The backend delete (remove) logic should now handle file cleanup for files SAVED to the entity.
                if (createdEntityId) {
                    await publicitesService.delete(createdEntityId.toString());
                    console.log("Rollback: Deleted created entity", createdEntityId);
                } else {
                    // If entity wasn't created (rare/impossible here as it's step 1), or if we are paranoid about files uploaded but not linked?
                    // With current flow, if step 1 fails, nothing to cleanup.
                    // If step 2 fails (upload), entity exists but has no image URL yet. We delete entity. File upload failed so no file.
                    // If step 2 succeeds (upload) but update fails? We have file in storage, but maybe not in DB?
                    // Actually, if update fails, the file URL is not in DB. So backend delete won't find it to delete contextually.
                    // So we must manually delete properly uploaded files that might NOT be in the DB yet if the update call failed.

                    if (uploadedImageUrl && (!createdEntityId || error.message.includes("update"))) {
                        // Attempt manual delete if we think it might be orphaned
                        await fichiersService.deleteFile(uploadedImageUrl);
                        console.log("Rollback: Deleted orphaned image file");
                    }
                    if (uploadedMediaUrl && (!createdEntityId || error.message.includes("update"))) {
                        await fichiersService.deleteFile(uploadedMediaUrl);
                        console.log("Rollback: Deleted orphaned media file");
                    }
                }
            } catch (rollbackError) {
                console.error("Rollback failed", rollbackError);
            }

            toast({
                title: "Erreur",
                description: error.message || "Échec de la création de la publicité",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPublicite) return;

        // Validate YouTube URL if type is Video
        if (editingPublicite.type_media === 'Video' && editingPublicite.media) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(editingPublicite.media)) {
                toast({
                    title: "URL Invalide",
                    description: "Veuillez entrer une URL YouTube valide (youtube.com ou youtu.be)",
                    variant: "destructive"
                });
                return;
            }
        }

        setIsUploading(true);
        let updatedImage = editingPublicite.image;
        let updatedMedia = editingPublicite.media;

        try {
            // Upload new Cover Image if selected
            if (selectedImageFile) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedImageFile,
                        type: 'PUBLICITE',
                        entityId: editingPublicite.id,
                        entitySubtype: 'image',
                    });
                    updatedImage = uploadResult.url;
                } catch (error) {
                    console.error("Failed to upload new cover image", error);
                    toast({
                        title: "Erreur Upload",
                        description: "Échec de l'upload de la nouvelle image de couverture",
                        variant: "destructive",
                    });
                    // Proceed anyway? Or stop? Let's stop to be safe.
                    setIsUploading(false);
                    return;
                }
            }

            // Upload new Media File if selected and type is Image
            if (editingPublicite.type_media === 'Image' && selectedMediaFile) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedMediaFile,
                        type: 'PUBLICITE',
                        entityId: editingPublicite.id,
                        entitySubtype: 'media',
                    });
                    updatedMedia = uploadResult.url;
                } catch (error) {
                    console.error("Failed to upload new media file", error);
                    toast({
                        title: "Erreur Upload",
                        description: "Échec de l'upload du nouveau fichier média",
                        variant: "destructive",
                    });
                    setIsUploading(false);
                    return;
                }
            } else if (editingPublicite.type_media === 'Video') {
                // If Video, updatedMedia should be the URL from input (editingPublicite.media)
                updatedMedia = editingPublicite.media;
            }

            await updateMutation.mutateAsync({
                id: editingPublicite.id.toString(),
                data: {
                    titre: editingPublicite.titre,
                    image: updatedImage,
                    media: updatedMedia,
                    type_media: editingPublicite.type_media,
                    ordre: editingPublicite.ordre,
                    actif: editingPublicite.actif,
                },
            });

            // Cleanup old files if they were replaced
            if (selectedImageFile && editingPublicite.image && editingPublicite.image !== updatedImage) {
                try {
                    await fichiersService.deleteFile(editingPublicite.image);
                    console.log("Deleted old cover image");
                } catch (e) {
                    console.error("Failed to delete old cover image", e);
                }
            }

            if (selectedMediaFile && editingPublicite.media && editingPublicite.media !== updatedMedia) {
                try {
                    await fichiersService.deleteFile(editingPublicite.media);
                    console.log("Deleted old media file");
                } catch (e) {
                    console.error("Failed to delete old media file", e);
                }
            }

        } finally {
            // Reset files only after success is handled by mutation, but here we are in sync logic partly.
            // Ideally we clear files in onSuccess of mutation.
            // But setIsUploading(false) should happen here or in mutation callbacks.
            // Since mutation is async, we let the mutation callbacks handle global loading state if any.
            // But we used a local 'isUploading' for the file part.
            setIsUploading(false);
        }
    };

    const openEditDialog = (publicite: Publicite) => {
        setEditingPublicite(publicite);
        setIsEditDialogOpen(true);
        setIsEditDialogOpen(true);
    };

    const handlePreview = async (item: Publicite) => {
        try {
            setPreviewTitle(item.titre);
            setPreviewUrl(null);

            if (item.type_media === 'Video' && item.media) {
                let url = item.media;
                // Robust regex to extract YouTube Video ID
                // Handles: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, https://youtube.com/embed/ID etc.
                const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

                if (videoIdMatch && videoIdMatch[1]) {
                    url = `https://www.youtube.com/embed/${videoIdMatch[1]}`;
                }
                setPreviewUrl(url);
                setIsPreviewOpen(true);
            } else {
                // Assume Image or file download
                setIsPreviewOpen(true);
                const blob = await publicitesService.downloadMedia(item.id);
                const url = window.URL.createObjectURL(blob);
                setPreviewUrl(url);
            }
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
                        <Megaphone className="h-8 w-8" />
                        Publicités
                    </h1>
                    <p className="text-muted-foreground">Gérer les publicités de la plateforme</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par titre..."
                            className="pl-8 w-[250px]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
                                        <Label htmlFor="image">Image de couverture</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="image-file"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageFileChange}
                                                className="flex-1"
                                            />
                                            {selectedImageFile && (
                                                <Badge variant="secondary" className="self-center">
                                                    {selectedImageFile.name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Type de média</Label>
                                        <Select
                                            value={formData.type_media}
                                            onValueChange={(value: "Image" | "Video") =>
                                                setFormData({ ...formData, type_media: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choisir le type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Image">Image</SelectItem>
                                                <SelectItem value="Video">Vidéo</SelectItem>
                                            </SelectContent>
                                        </Select>

                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="media">
                                            {formData.type_media === 'Video' ? 'Lien Vidéo' : 'Fichier Média (Contenu)'}
                                        </Label>
                                        {formData.type_media === 'Video' ? (
                                            <Input
                                                id="media-url"
                                                type="url"
                                                placeholder="https://youtu.be/..."
                                                value={formData.media || ''}
                                                onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                                            />
                                        ) : (
                                            <div className="flex gap-2">
                                                <Input
                                                    id="media-file"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleMediaFileChange}
                                                    className="flex-1"
                                                />
                                                {selectedMediaFile && (
                                                    <Badge variant="secondary" className="self-center">
                                                        {selectedMediaFile.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
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
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="actif">Actif</Label>
                                        <input
                                            type="checkbox"
                                            id="actif"
                                            checked={formData.actif}
                                            onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                                            className="h-4 w-4"
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
                                    <TableHead>Type</TableHead>
                                    <TableHead>Ordre</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {publicites.map((publicite) => (
                                    <TableRow key={publicite.id}>
                                        <TableCell className="font-medium">{publicite.titre}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{publicite.type_media || 'Image'}</Badge>
                                        </TableCell>
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
                                                    onClick={() => handlePreview(publicite)}
                                                    title="Visualiser"
                                                    disabled={!publicite.media}
                                                >
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
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
                                <Label htmlFor="edit-type_media">Type de média</Label>
                                <Select
                                    value={editingPublicite?.type_media || "Image"}
                                    onValueChange={(value: "Image" | "Video") =>
                                        setEditingPublicite(
                                            editingPublicite ? { ...editingPublicite, type_media: value } : null
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir le type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Image">Image</SelectItem>
                                        <SelectItem value="Video">Vidéo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-image">Image de couverture</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="edit-image-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageFileChange}
                                        className="flex-1"
                                    />
                                    {selectedImageFile && (
                                        <Badge variant="secondary" className="self-center">
                                            {selectedImageFile.name}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-media">
                                    {editingPublicite?.type_media === 'Video' ? 'Lien Vidéo' : 'Fichier Média (Contenu)'}
                                </Label>
                                {editingPublicite?.type_media === 'Video' ? (
                                    <Input
                                        id="edit-media-url"
                                        type="url"
                                        placeholder="https://youtu.be/..."
                                        value={editingPublicite.media || ''}
                                        onChange={(e) => setEditingPublicite({ ...editingPublicite, media: e.target.value })}
                                    />
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            id="edit-media-file"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleMediaFileChange}
                                            className="flex-1"
                                        />
                                        {selectedMediaFile && (
                                            <Badge variant="secondary" className="self-center">
                                                {selectedMediaFile.name}
                                            </Badge>
                                        )}
                                    </div>
                                )}
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

                            <div className="flex items-center gap-2">
                                <Label htmlFor="edit-actif">Actif</Label>
                                <input
                                    type="checkbox"
                                    id="edit-actif"
                                    checked={editingPublicite?.actif || false}
                                    onChange={(e) =>
                                        setEditingPublicite(
                                            editingPublicite ? { ...editingPublicite, actif: e.target.checked } : null
                                        )
                                    }
                                    className="h-4 w-4"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending || isUploading}>
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
        </div >
    );
}
