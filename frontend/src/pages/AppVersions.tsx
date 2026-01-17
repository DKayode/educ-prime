import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Smartphone, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { appVersionService, AppPlatform, type AppVersion } from "@/lib/services/app-version.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function AppVersions() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<AppVersion | null>(null);
    const [searchPlatform, setSearchPlatform] = useState<string>("ALL");

    const [formData, setFormData] = useState<Partial<AppVersion>>({
        platform: AppPlatform.ANDROID,
        version: "",
        minimum_required_version: "",
        update_url: "",
        force_update: false,
        is_active: false,
        release_notes: { fr: "", en: "" }
    });

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: itemsResponse, isLoading, isPlaceholderData } = useQuery({
        queryKey: ["app-versions", searchPlatform],
        queryFn: () => appVersionService.getAll({
            platform: searchPlatform !== "ALL" ? (searchPlatform as AppPlatform) : undefined
        }),
        placeholderData: keepPreviousData,
    });
    const items = itemsResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: Partial<AppVersion>) => appVersionService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app-versions"] });
            setIsCreateDialogOpen(false);
            setFormData({
                platform: AppPlatform.ANDROID,
                version: "",
                minimum_required_version: "",
                update_url: "",
                force_update: false,
                is_active: false,
                release_notes: { fr: "", en: "" }
            });
            toast({ title: "Succès", description: "Version créée avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<AppVersion> }) => appVersionService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app-versions"] });
            setIsEditDialogOpen(false);
            setEditingItem(null);
            toast({ title: "Succès", description: "Version mise à jour avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => appVersionService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["app-versions"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Version supprimée avec succès" });
        },
        onError: (error: any) => {
            // Check for specific error message or status code if possible. 
            // Assuming the backend returns the message we threw.
            const message = error.message || "Impossible de supprimer";
            if (message.includes("Cannot delete the active version")) {
                toast({
                    title: "Suppression impossible",
                    description: "Cette version est actuellement active. Veuillez activer une autre version avant de supprimer celle-ci.",
                    variant: "destructive"
                });
            } else {
                toast({ title: "Erreur", description: message, variant: "destructive" });
            }
        }
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            const { id, created_at, updated_at, ...updateData } = editingItem;
            updateMutation.mutate({ id: editingItem.id, data: updateData });
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
                        <Smartphone className="h-8 w-8" />
                        Versions Mobile
                    </h1>
                    <p className="text-muted-foreground">Gérer les mises à jour des applications</p>
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
                                <DialogTitle>Nouvelle Version</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Plateforme</Label>
                                        <Select onValueChange={(val) => setFormData({ ...formData, platform: val as AppPlatform })} defaultValue={formData.platform}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={AppPlatform.ANDROID}>Android</SelectItem>
                                                <SelectItem value={AppPlatform.IOS}>iOS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Version (x.y.z)</Label>
                                        <Input value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} required placeholder="1.0.0" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Version Min. Requise</Label>
                                        <Input value={formData.minimum_required_version} onChange={(e) => setFormData({ ...formData, minimum_required_version: e.target.value })} required placeholder="1.0.0" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>URL Store</Label>
                                        <Input value={formData.update_url} onChange={(e) => setFormData({ ...formData, update_url: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Notes (FR)</Label>
                                    <Textarea value={formData.release_notes?.fr || ""} onChange={(e) => setFormData({ ...formData, release_notes: { ...formData.release_notes, fr: e.target.value } })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Notes (EN)</Label>
                                    <Textarea value={formData.release_notes?.en || ""} onChange={(e) => setFormData({ ...formData, release_notes: { ...formData.release_notes, en: e.target.value } })} />
                                </div>
                                <div className="flex gap-6 mt-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="force_update" checked={formData.force_update} onCheckedChange={(checked) => setFormData({ ...formData, force_update: checked as boolean })} />
                                        <Label htmlFor="force_update">Forcer la mise à jour</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })} />
                                        <Label htmlFor="is_active">Activer immédiatement</Label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Versions Historiques</CardTitle>
                    <div className="flex gap-4 mt-2">
                        <Select value={searchPlatform} onValueChange={setSearchPlatform}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filtrer par plateforme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes les plateformes</SelectItem>
                                <SelectItem value={AppPlatform.ANDROID}>Android</SelectItem>
                                <SelectItem value={AppPlatform.IOS}>iOS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plateforme</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Min. Requis</TableHead>
                                <TableHead>Actif</TableHead>
                                <TableHead>Force Update</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Badge variant="outline">{item.platform}</Badge>
                                    </TableCell>
                                    <TableCell className="font-medium font-mono">{item.version}</TableCell>
                                    <TableCell className="font-mono text-muted-foreground">{item.minimum_required_version}</TableCell>
                                    <TableCell>
                                        {item.is_active ? (
                                            <Badge className="bg-green-500 hover:bg-green-600">Actif</Badge>
                                        ) : (
                                            <Badge variant="secondary">Inactif</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.force_update ? <Check className="h-4 w-4 text-orange-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                    </TableCell>
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
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader><DialogTitle>Modifier la version</DialogTitle></DialogHeader>
                        {editingItem && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Version</Label>
                                        <Input value={editingItem.version} onChange={(e) => setEditingItem({ ...editingItem, version: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Min. Requis</Label>
                                        <Input value={editingItem.minimum_required_version} onChange={(e) => setEditingItem({ ...editingItem, minimum_required_version: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>URL Store</Label>
                                    <Input value={editingItem.update_url} onChange={(e) => setEditingItem({ ...editingItem, update_url: e.target.value })} />
                                </div>
                                <div className="flex gap-6 mt-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="edit_force" checked={editingItem.force_update} onCheckedChange={(c) => setEditingItem({ ...editingItem, force_update: c as boolean })} />
                                        <Label htmlFor="edit_force">Forcer Update</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="edit_active" checked={editingItem.is_active} onCheckedChange={(c) => setEditingItem({ ...editingItem, is_active: c as boolean })} />
                                        <Label htmlFor="edit_active">Actif</Label>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Cela supprimera définitivement cette version.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
