import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceTypesService, ServiceTypeItem } from '@/lib/services/service-types.service';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Trash2, Edit2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ServiceTypesAdmin() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<ServiceTypeItem | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ nom: '', description: '' });
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: serviceTypes, isLoading } = useQuery({
        queryKey: ['serviceTypes'],
        queryFn: () => serviceTypesService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: Omit<ServiceTypeItem, 'id' | 'slug'>) => serviceTypesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['serviceTypes'] });
            toast({ title: "Succès", description: "Type de service créé avec succès." });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.message || "Une erreur est survenue lors de la création.",
                variant: "destructive"
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<ServiceTypeItem> }) => serviceTypesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['serviceTypes'] });
            toast({ title: "Succès", description: "Type de service mis à jour." });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.message || "Erreur lors de la mise à jour.",
                variant: "destructive"
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => serviceTypesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['serviceTypes'] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Type de service supprimé." });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.message || "Erreur de suppression (des services y sont probablement rattachés).",
                variant: "destructive"
            });
        }
    });

    const resetForm = () => {
        setEditingType(null);
        setFormData({ nom: '', description: '' });
    };

    const handleOpenDialog = (type?: ServiceTypeItem) => {
        if (type) {
            setEditingType(type);
            setFormData({
                nom: type.nom,
                description: type.description || ''
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingType) {
            updateMutation.mutate({ id: editingType.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleNomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            nom: e.target.value
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Types de Services</h1>
                    <p className="text-muted-foreground mt-2">
                        Gérez les catégories et types de services proposés sur la plateforme.
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Ajouter un type
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des types de services</CardTitle>
                    <CardDescription>
                        Attention : Supprimer un type n'est possible que si aucun service ne lui est rattaché.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {serviceTypes && serviceTypes.length > 0 ? (
                                        serviceTypes.map((type) => (
                                            <TableRow key={type.id}>
                                                <TableCell className="font-medium">{type.nom}</TableCell>
                                                <TableCell>
                                                    <span className="bg-muted px-2 py-1 rounded text-xs font-mono">
                                                        {type.slug}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground max-w-xs truncate">
                                                    {type.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenDialog(type)}
                                                        >
                                                            <Edit2 className="h-4 w-4 text-blue-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setDeleteId(type.id)}
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                Aucun type de service trouvé.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingType ? 'Modifier le type de service' : 'Nouveau type de service'}
                        </DialogTitle>
                        <DialogDescription>
                            Remplissez les informations ci-dessous pour le type de service.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="nom">Nom du type</Label>
                            <Input
                                id="nom"
                                required
                                value={formData.nom}
                                onChange={handleNomChange}
                                placeholder="Ex: Soutien Scolaire"
                            />
                        </div>


                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optionnelle)</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Description du type de service..."
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                {editingType ? 'Mettre à jour' : 'Créer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce type de service ?
                            Attention : Cette action est impossible si des services y sont encore rattachés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
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
