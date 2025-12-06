import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { concoursExamensService, type ConcoursExamen, type ConcoursExamenType } from "@/lib/services/concours-examens.service";
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

interface ConcoursExamenFormData {
    titre: string;
    type: ConcoursExamenType;
    pays?: string;
    niveau?: string;
    date?: string;
    lieu?: string;
    image?: string;
    rubriques?: string;
    fichiers_telechargeables?: string;
    actif: boolean;
}

export default function ConcoursExamens() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<ConcoursExamen | null>(null);
    const [formData, setFormData] = useState<ConcoursExamenFormData>({
        titre: "",
        type: "Concours",
        pays: "",
        niveau: "",
        date: "",
        lieu: "",
        image: "",
        rubriques: "",
        fichiers_telechargeables: "",
        actif: true,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["concours-examens"],
        queryFn: () => concoursExamensService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: ConcoursExamenFormData) => concoursExamensService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-examens"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", type: "Concours", pays: "", niveau: "", date: "", lieu: "", image: "", rubriques: "", fichiers_telechargeables: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Concours/Examen créé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ConcoursExamenFormData> }) =>
            concoursExamensService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-examens"] });
            setIsEditDialogOpen(false);
            setEditingItem(null);
            toast({ title: "Succès", description: "Concours/Examen mis à jour avec succès" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => concoursExamensService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-examens"] });
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
            // Step 1: Create entity without image
            const createdItem = await concoursExamensService.create({
                ...formData,
                image: formData.image || undefined,
            });

            // Step 2: Upload file if selected
            if (selectedFile && createdItem.id) {
                try {
                    const uploadResult = await fichiersService.uploadImage({
                        file: selectedFile,
                        type: 'CONCOURS_EXAMEN',
                        entityId: createdItem.id,
                        entitySubtype: formData.type.toLowerCase(), // 'concours' or 'examens'
                    });

                    // Step 3: Update entity with image URL
                    await concoursExamensService.update(createdItem.id.toString(), {
                        image: uploadResult.url,
                    });
                } catch (uploadError: any) {
                    // Rollback: Delete the created entity
                    await concoursExamensService.delete(createdItem.id.toString());
                    throw new Error("Échec de l'upload de l'image: " + (uploadError.message || "Erreur inconnue"));
                }
            }

            // Success
            queryClient.invalidateQueries({ queryKey: ["concours-examens"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", type: "Concours", pays: "", niveau: "", date: "", lieu: "", image: "", rubriques: "", fichiers_telechargeables: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Concours/Examen créé avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id.toString(), data: editingItem });
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
                        <GraduationCap className="h-8 w-8" />
                        Concours & Examens
                    </h1>
                    <p className="text-muted-foreground">Gérer les concours et examens</p>
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
                                <DialogTitle>Créer un concours/examen</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="titre">Titre *</Label>
                                    <Input id="titre" value={formData.titre} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="type">Type *</Label>
                                        <Select value={formData.type} onValueChange={(value: ConcoursExamenType) => setFormData({ ...formData, type: value })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Concours">Concours</SelectItem>
                                                <SelectItem value="Examens">Examens</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="niveau">Niveau</Label>
                                        <Input id="niveau" value={formData.niveau} onChange={(e) => setFormData({ ...formData, niveau: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="pays">Pays</Label>
                                        <Input id="pays" value={formData.pays} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lieu">Lieu</Label>
                                    <Input id="lieu" value={formData.lieu} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
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
                                <div className="grid gap-2">
                                    <Label htmlFor="rubriques">Rubriques</Label>
                                    <Textarea id="rubriques" value={formData.rubriques} onChange={(e) => setFormData({ ...formData, rubriques: e.target.value })} />
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
                    <CardTitle>Liste des concours & examens</CardTitle>
                    <CardDescription>{items.length} élément{items.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Aucun concours/examen trouvé.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Niveau</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.titre}</TableCell>
                                        <TableCell><Badge variant={item.type === "Concours" ? "default" : "secondary"}>{item.type}</Badge></TableCell>
                                        <TableCell>{item.niveau || "—"}</TableCell>
                                        <TableCell>{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : "—"}</TableCell>
                                        <TableCell><Badge variant={item.actif ? "default" : "secondary"}>{item.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
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
                    <form onSubmit={handleEdit}>
                        <DialogHeader><DialogTitle>Modifier</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Titre *</Label>
                                <Input value={editingItem?.titre || ""} onChange={(e) => setEditingItem(editingItem ? { ...editingItem, titre: e.target.value } : null)} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise à jour...</> : "Mettre à jour"}
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
        </div>
    );
}
