import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
    date_heure?: string;
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
        date_heure: "",
        lieu: "",
        lien_inscription: "",
        image: "",
        actif: true,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: evenements = [], isLoading } = useQuery({
        queryKey: ["evenements"],
        queryFn: () => evenementsService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: EvenementFormData) => evenementsService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evenements"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", description: "", date_heure: "", lieu: "", lien_inscription: "", image: "", actif: true });
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
            setFormData({ titre: "", description: "", date_heure: "", lieu: "", lien_inscription: "", image: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Événement créé avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEvenement) {
            updateMutation.mutate({
                id: editingEvenement.id.toString(),
                data: editingEvenement,
            });
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
                                        <Label htmlFor="date_heure">Date et heure</Label>
                                        <Input
                                            id="date_heure"
                                            type="datetime-local"
                                            value={formData.date_heure}
                                            onChange={(e) => setFormData({ ...formData, date_heure: e.target.value })}
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
                                    <p className="text-xs text-muted-foreground">
                                        Ou entrez une URL manuellement ci-dessous
                                    </p>
                                    <Input
                                        id="image"
                                        placeholder="https://..."
                                        value={formData.image}
                                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
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
                                        <TableCell>{evenement.date_heure ? new Date(evenement.date_heure).toLocaleDateString('fr-FR') : "—"}</TableCell>
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

            {/* Edit Dialog - Similar structure */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleEdit}>
                        <DialogHeader>
                            <DialogTitle>Modifier l'événement</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Titre *</Label>
                                <Input
                                    value={editingEvenement?.titre || ""}
                                    onChange={(e) =>
                                        setEditingEvenement(editingEvenement ? { ...editingEvenement, titre: e.target.value } : null)
                                    }
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editingEvenement?.description || ""}
                                    onChange={(e) =>
                                        setEditingEvenement(editingEvenement ? { ...editingEvenement, description: e.target.value } : null)
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
        </div>
    );
}
