import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { etablissementsService } from "@/lib/services/etablissements.service";
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

interface EtablissementFormData {
  nom: string;
  ville: string;
  code_postal: string;
}

export default function Etablissements() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingEtablissement, setEditingEtablissement] = useState<{ id: number } & EtablissementFormData | null>(null);
  const [formData, setFormData] = useState<EtablissementFormData>({
    nom: "",
    ville: "",
    code_postal: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: etablissements = [], isLoading } = useQuery({
    queryKey: ["etablissements"],
    queryFn: () => etablissementsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: EtablissementFormData) => etablissementsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsCreateDialogOpen(false);
      setFormData({ nom: "", ville: "", code_postal: "" });
      toast({
        title: "Succès",
        description: "Établissement créé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de l'établissement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EtablissementFormData> }) =>
      etablissementsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      setIsEditDialogOpen(false);
      setEditingEtablissement(null);
      toast({
        title: "Succès",
        description: "Établissement mis à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour de l'établissement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => etablissementsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
      toast({
        title: "Succès",
        description: "Établissement supprimé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la suppression de l'établissement",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEtablissement) {
      updateMutation.mutate({
        id: editingEtablissement.id,
        data: {
          nom: editingEtablissement.nom,
          ville: editingEtablissement.ville,
          code_postal: editingEtablissement.code_postal,
        },
      });
    }
  };

  const openEditDialog = (etablissement: any) => {
    setEditingEtablissement({
      id: etablissement.id,
      nom: etablissement.nom,
      ville: etablissement.ville || "",
      code_postal: etablissement.code_postal || "",
    });
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
            <Building2 className="h-8 w-8" />
            Établissements
          </h1>
          <p className="text-muted-foreground">Gérer les établissements d'enseignement</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un établissement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Créer un établissement</DialogTitle>
                <DialogDescription>
                  Ajouter un nouvel établissement d'enseignement
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input
                    id="code_postal"
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
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
          <CardTitle>Liste des établissements</CardTitle>
          <CardDescription>
            {etablissements.length} établissement{etablissements.length > 1 ? "s" : ""} enregistré
            {etablissements.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {etablissements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun établissement trouvé. Créez-en un pour commencer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Code postal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {etablissements.map((etablissement) => (
                  <TableRow key={etablissement.id}>
                    <TableCell className="font-medium">{etablissement.id}</TableCell>
                    <TableCell className="font-medium">{etablissement.nom}</TableCell>
                    <TableCell>{etablissement.ville || "—"}</TableCell>
                    <TableCell>{etablissement.code_postal || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(etablissement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(etablissement.id)}
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
              <DialogTitle>Modifier l'établissement</DialogTitle>
              <DialogDescription>Mettre à jour les informations de l'établissement</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nom">Nom *</Label>
                <Input
                  id="edit-nom"
                  value={editingEtablissement?.nom || ""}
                  onChange={(e) =>
                    setEditingEtablissement(
                      editingEtablissement ? { ...editingEtablissement, nom: e.target.value } : null
                    )
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ville">Ville</Label>
                <Input
                  id="edit-ville"
                  value={editingEtablissement?.ville || ""}
                  onChange={(e) =>
                    setEditingEtablissement(
                      editingEtablissement ? { ...editingEtablissement, ville: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code_postal">Code postal</Label>
                <Input
                  id="edit-code_postal"
                  value={editingEtablissement?.code_postal || ""}
                  onChange={(e) =>
                    setEditingEtablissement(
                      editingEtablissement
                        ? { ...editingEtablissement, code_postal: e.target.value }
                        : null
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
              Êtes-vous sûr de vouloir supprimer cet établissement ? Cette action est irréversible et
              supprimera également toutes les filières associées.
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
