import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
    pays?: string;
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
    const [formData, setFormData] = useState<OpportuniteFormData>({
        titre: "",
        type: "Bourses",
        organisme: "",
        pays: "",
        date_limite: "",
        image: "",
        lien_postuler: "",
        actif: true,
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: opportunites = [], isLoading } = useQuery({
        queryKey: ["opportunites"],
        queryFn: () => opportunitesService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: OpportuniteFormData) => opportunitesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunites"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            setFormData({ titre: "", type: "Bourses", organisme: "", pays: "", date_limite: "", image: "", lien_postuler: "", actif: true });
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
            setFormData({ titre: "", type: "Bourses", organisme: "", pays: "", date_limite: "", image: "", lien_postuler: "", actif: true });
            setSelectedFile(null);
            toast({ title: "Succès", description: "Opportunité créée avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOpportunite) {
            updateMutation.mutate({ id: editingOpportunite.id.toString(), data: editingOpportunite });
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
                                        <Label htmlFor="pays">Pays</Label>
                                        <Input id="pays" value={formData.pays} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} />
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
                    <CardDescription>{opportunites.length} opportunité{opportunites.length > 1 ? "s" : ""}</CardDescription>
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
                                        <TableCell>{opp.date_limite ? new Date(opp.date_limite).toLocaleDateString('fr-FR') : "—"}</TableCell>
                                        <TableCell><Badge variant={opp.actif ? "default" : "secondary"}>{opp.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
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
                    <form onSubmit={handleEdit}>
                        <DialogHeader><DialogTitle>Modifier l'opportunité</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Titre *</Label>
                                <Input value={editingOpportunite?.titre || ""} onChange={(e) => setEditingOpportunite(editingOpportunite ? { ...editingOpportunite, titre: e.target.value } : null)} required />
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
        </div>
    );
}
