import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Pencil, Trash2, Loader2, Search, Eye } from "lucide-react";
import { parcoursService, type Parcour } from "@/lib/services/parcours.service";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

interface ParcoursFormData {
    titre: string;
    image_couverture?: string;
    lien_video?: string;
    type_media: 'image' | 'video';
    categorie: string;
    description: string;
}

export default function Parcours() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingParcour, setEditingParcour] = useState<Parcour | null>(null);
    const [formData, setFormData] = useState<ParcoursFormData>({
        titre: "",
        image_couverture: "",
        lien_video: "",
        type_media: "image",
        categorie: "",
        description: "",
    });
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null); // Kept for compatibility if needed, but mostly unused for URL
    const [selectedContentFile, setSelectedContentFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: parcoursResponse, isLoading } = useQuery({
        queryKey: ["parcours", debouncedSearch],
        queryFn: () => parcoursService.getAll({ titre: debouncedSearch }),
    });
    const parcours = parcoursResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: ParcoursFormData) => parcoursService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parcours"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", image_couverture: "", lien_video: "", type_media: "image", categorie: "", description: "" });
            setSelectedImageFile(null);
            setSelectedVideoFile(null);
            toast({
                title: "Succès",
                description: "Parcours créé avec succès",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la création",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ParcoursFormData> }) =>
            parcoursService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parcours"] });
            setIsEditDialogOpen(false);
            setEditingParcour(null);
            setSelectedImageFile(null);
            setSelectedVideoFile(null);
            toast({
                title: "Succès",
                description: "Parcours mis à jour avec succès",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la mise à jour",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => parcoursService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parcours"] });
            setDeleteId(null);
            toast({
                title: "Succès",
                description: "Parcours supprimé avec succès",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.message || "Échec de la suppression",
                variant: "destructive",
            });
        },
    });

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImageFile(e.target.files[0]);
        }
    };

    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedVideoFile(e.target.files[0]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate YouTube URL if type is video
        if (formData.type_media === 'video' && formData.lien_video) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(formData.lien_video)) {
                toast({
                    title: "URL Invalide",
                    description: "Veuillez entrer une URL YouTube valide (youtube.com ou youtu.be)",
                    variant: "destructive"
                });
                return;
            }
        }

        setIsUploading(true);
        let createdId: number | null = null;

        try {
            // 1. Create Entity
            const created = await parcoursService.create({
                ...formData,
                image_couverture: undefined,
                // Pass lien_video if it's a video type (URL), otherwise undefined (waiting for file upload if we had that, but we don't for video anymore)
                lien_video: formData.type_media === 'video' ? formData.lien_video : undefined,
            });
            createdId = created.id;

            // 2. Upload Cover Image & Handle Content Image Fallback
            if (selectedImageFile && created.id) {
                // A. Upload Cover Image
                const uploadCover = await fichiersService.uploadImage({
                    file: selectedImageFile,
                    type: 'PARCOURS',
                    entityId: created.id,
                    entitySubtype: 'image',
                });
                let updateData: any = { image_couverture: uploadCover.url };

                // B. If type is Image, reuse cover as media content OR use specific content file
                if (formData.type_media === 'image') {
                    const fileToUpload = selectedContentFile || selectedImageFile;

                    if (fileToUpload) {
                        const uploadMedia = await fichiersService.uploadImage({
                            file: fileToUpload,
                            type: 'PARCOURS',
                            entityId: created.id,
                            entitySubtype: 'media',
                        });
                        updateData.lien_video = uploadMedia.url;
                    }
                }

                await parcoursService.update(created.id.toString(), updateData);
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["parcours"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", image_couverture: "", lien_video: "", type_media: "image", categorie: "", description: "" });
            setSelectedImageFile(null);
            setSelectedVideoFile(null);
            setSelectedContentFile(null);
            toast({ title: "Succès", description: "Parcours créé avec succès" });

        } catch (error: any) {
            console.error("Creation failed", error);
            if (createdId) {
                await parcoursService.delete(createdId.toString());
            }
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParcour) return;
        setIsUploading(true);

        let newImage = editingParcour.image_couverture;
        let newVideo = editingParcour.lien_video;

        // Validate YouTube URL if type is video
        if (editingParcour.type_media === 'video' && editingParcour.lien_video) {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(editingParcour.lien_video)) {
                toast({
                    title: "URL Invalide",
                    description: "Veuillez entrer une URL YouTube valide (youtube.com ou youtu.be)",
                    variant: "destructive"
                });
                setIsUploading(false);
                return;
            }
        }

        try {
            if (selectedImageFile) {
                const upload = await fichiersService.uploadImage({
                    file: selectedImageFile,
                    type: 'PARCOURS',
                    entityId: editingParcour.id,
                    entitySubtype: 'image',
                });
                newImage = upload.url;
            }

            // Video is now handled by URL input directly in editingParcour.lien_video
            // if (selectedVideoFile) { ... }

            await updateMutation.mutateAsync({
                id: editingParcour.id.toString(),
                data: {
                    titre: editingParcour.titre,
                    categorie: editingParcour.categorie,
                    description: editingParcour.description,
                    type_media: editingParcour.type_media,
                    image_couverture: newImage,
                    lien_video: editingParcour.lien_video,
                }
            });

            if (selectedImageFile && editingParcour.image_couverture && editingParcour.image_couverture !== newImage) {
                // Cleanup old image
                try { await fichiersService.deleteFile(editingParcour.image_couverture); } catch { }
            }
            if (selectedVideoFile && editingParcour.lien_video && editingParcour.lien_video !== newVideo) {
                // Cleanup old video
                try { await fichiersService.deleteFile(editingParcour.lien_video); } catch { }
            }

        } catch (error: any) {
            toast({ title: "Erreur", description: "Échec de la mise à jour", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const openEditDialog = (item: Parcour) => {
        setEditingParcour(item);
        setIsEditDialogOpen(true);
    };

    const handlePreview = async (item: Parcour) => {
        try {
            setPreviewTitle(item.titre);
            setPreviewUrl(null); // Reset first

            if (item.type_media === 'video' && item.lien_video) {
                // For video, use the URL directly
                // Ensure it's embeddable or just show it. 
                // If it's a YouTube link, we might need to process it for iframe, or just try iframe.
                // For now, assume it's an embeddable URL or just plain link. 
                // If it's standard YouTube watch link, iframe might refuse connection. 
                // Let's transform common YouTube watch links to embed if possible, or just pass as is.
                let url = item.lien_video;
                // Robust regex to extract YouTube Video ID
                // Handles: https://www.youtube.com/watch?v=ID, https://youtu.be/ID, https://youtube.com/embed/ID etc.
                const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);

                if (videoIdMatch && videoIdMatch[1]) {
                    url = `https://www.youtube.com/embed/${videoIdMatch[1]}`;
                }

                setPreviewUrl(url);
                setIsPreviewOpen(true);
            } else if ((item.type_media === 'image' || !item.type_media) && item.image_couverture) {
                // For image, download it
                setIsPreviewOpen(true);
                const blob = await parcoursService.downloadImage(item.id);
                const url = window.URL.createObjectURL(blob);
                setPreviewUrl(url);
            } else {
                toast({ title: "Info", description: "Aucun contenu à visualiser", variant: "default" });
            }
        } catch (error) {
            console.error("Preview error:", error);
            toast({ title: "Erreur", description: "Erreur lors du chargement de l'aperçu", variant: "destructive" });
            setIsPreviewOpen(false);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        if (previewUrl && !previewUrl.startsWith('http')) {
            // Only revoke object URLs (blob:...)
            window.URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    };

    if (isLoading) {
        return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="h-8 w-8" />
                        Parcours
                    </h1>
                    <p className="text-muted-foreground">Gérer les parcours de formation</p>
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
                            <Button className="gap-2"><Plus className="h-4 w-4" /> Ajouter un parcours</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[600px]">
                            <form onSubmit={handleCreate}>
                                <DialogHeader>
                                    <DialogTitle>Créer un parcours</DialogTitle>
                                    <DialogDescription>Ajouter un nouveau parcours de formation</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="titre">Titre *</Label>
                                            <Input id="titre" value={formData.titre} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="categorie">Catégorie *</Label>
                                            <Input id="categorie" value={formData.categorie} onChange={(e) => setFormData({ ...formData, categorie: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Type de média</Label>
                                        <Select value={formData.type_media} onValueChange={(v: "image" | "video") => setFormData({ ...formData, type_media: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="image">Image</SelectItem>
                                                <SelectItem value="video">Vidéo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description *</Label>
                                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="image">Image de couverture</Label>
                                        <Input id="image" type="file" accept="image/*" onChange={handleImageFileChange} />
                                    </div>
                                    {formData.type_media === 'video' ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="video">Lien Vidéo *</Label>
                                            <Input
                                                id="video"
                                                type="url"
                                                placeholder="https://youtu.be/..."
                                                value={formData.lien_video || ''}
                                                onChange={(e) => setFormData({ ...formData, lien_video: e.target.value })}
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <Label htmlFor="content-file">Contenu Image (Optionnel)</Label>
                                            <Input
                                                id="content-file"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSelectedContentFile(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Si laissé vide, l'image de couverture sera utilisée comme contenu.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isUploading}>{isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Upload...</> : "Créer"}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des parcours</CardTitle>
                    <CardDescription>{parcours.length} parcours enregistré{parcours.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                    {parcours.length === 0 ? <div className="text-center py-8 text-muted-foreground">Aucun parcours trouvé.</div> :
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Catégorie</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parcours.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.titre}</TableCell>
                                        <TableCell>{item.categorie}</TableCell>
                                        <TableCell><Badge variant="outline">{item.type_media}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handlePreview(item)}
                                                    title="Visualiser"
                                                    disabled={!item.image_couverture && !item.lien_video}
                                                >
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
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

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && closePreview()}>
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>{previewTitle}</DialogTitle>
                        <DialogDescription>
                            Aperçu du contenu
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 h-full min-h-[60vh] w-full rounded-md border bg-muted/50">
                        {previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded-md"
                                title="Aperçu du contenu"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-[600px]">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle>Modifier le parcours</DialogTitle>
                        </DialogHeader>
                        {editingParcour && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Titre</Label>
                                        <Input value={editingParcour.titre} onChange={(e) => setEditingParcour({ ...editingParcour, titre: e.target.value })} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Catégorie</Label>
                                        <Input value={editingParcour.categorie} onChange={(e) => setEditingParcour({ ...editingParcour, categorie: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Type de média</Label>
                                    <Select value={editingParcour.type_media} onValueChange={(v: "image" | "video") => setEditingParcour({ ...editingParcour, type_media: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="video">Vidéo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Description</Label>
                                    <Textarea value={editingParcour.description} onChange={(e) => setEditingParcour({ ...editingParcour, description: e.target.value })} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nouvelle Image (Laissez vide pour conserver)</Label>
                                    <Input type="file" accept="image/*" onChange={handleImageFileChange} />
                                </div>
                                {editingParcour.type_media === 'video' ? (
                                    <div className="grid gap-2">
                                        <Label>Lien Vidéo</Label>
                                        <Input
                                            type="url"
                                            placeholder="https://youtu.be/..."
                                            value={editingParcour.lien_video || ''}
                                            onChange={(e) => setEditingParcour({ ...editingParcour, lien_video: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        <Label>Nouveau Contenu Image (Optionnel)</Label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setSelectedContentFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </div>
                                )}
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
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer ce parcours ?</AlertDialogDescription>
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
