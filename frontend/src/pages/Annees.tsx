import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { niveauxService } from "@/lib/services/niveaux.service";
import { filieresService } from "@/lib/services/filieres.service";

export default function Annees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ nom: "", duree_mois: "", filiere_id: "" });
  const queryClient = useQueryClient();

  const { data: niveaux = [], isLoading } = useQuery({
    queryKey: ['niveaux'],
    queryFn: () => niveauxService.getAll(),
  });

  const { data: filieres = [] } = useQuery({
    queryKey: ['filieres'],
    queryFn: () => filieresService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { nom: string; duree_mois?: number; filiere_id: number }) => 
      niveauxService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      toast.success("Niveau d'étude ajouté avec succès");
      setIsDialogOpen(false);
      setFormData({ nom: "", duree_mois: "", filiere_id: "" });
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => niveauxService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      toast.success("Niveau d'étude supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleAdd = () => {
    if (!formData.nom || !formData.filiere_id) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }
    createMutation.mutate({
      nom: formData.nom,
      duree_mois: formData.duree_mois ? parseInt(formData.duree_mois) : undefined,
      filiere_id: parseInt(formData.filiere_id),
    });
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Niveaux d'études</h1>
          <p className="text-muted-foreground">Gérer les niveaux d'études</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau niveau
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un niveau d'étude</DialogTitle>
              <DialogDescription>
                Créez un nouveau niveau d'étude
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du niveau</Label>
                <Input
                  id="nom"
                  placeholder="Ex: Licence 1"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duree">Durée (mois)</Label>
                <Input
                  id="duree"
                  type="number"
                  placeholder="12"
                  value={formData.duree_mois}
                  onChange={(e) => setFormData({ ...formData, duree_mois: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filiere">Filière</Label>
                <Select
                  value={formData.filiere_id}
                  onValueChange={(value) => setFormData({ ...formData, filiere_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une filière" />
                  </SelectTrigger>
                  <SelectContent>
                    {filieres.map((filiere) => (
                      <SelectItem key={filiere.id} value={filiere.id.toString()}>
                        {filiere.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  "Ajouter"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {niveaux.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Aucun niveau d'étude trouvé
            </div>
          ) : (
            niveaux.map((niveau) => (
              <Card key={niveau.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <span>{niveau.nom}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(niveau.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {niveau.filiere?.nom || "Filière non définie"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                    <span className="text-sm font-medium text-foreground">Durée</span>
                    <span className="text-sm font-bold text-primary">
                      {niveau.duree_mois ? `${niveau.duree_mois} mois` : 'Non définie'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
