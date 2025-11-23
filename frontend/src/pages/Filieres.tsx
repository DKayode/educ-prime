import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { filieresService } from "@/lib/services/filieres.service";
import { etablissementsService } from "@/lib/services/etablissements.service";

export default function Filieres() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ nom: "", etablissement_id: "" });
  const queryClient = useQueryClient();

  const { data: filieres = [], isLoading } = useQuery({
    queryKey: ['filieres'],
    queryFn: () => filieresService.getAll(),
  });

  const { data: etablissements = [] } = useQuery({
    queryKey: ['etablissements'],
    queryFn: () => etablissementsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { nom: string; etablissement_id: number }) => 
      filieresService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filieres'] });
      toast.success("Filière ajoutée avec succès");
      setIsDialogOpen(false);
      setFormData({ nom: "", etablissement_id: "" });
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de la filière");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => filieresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filieres'] });
      toast.success("Filière supprimée avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleAddFiliere = () => {
    if (!formData.nom || !formData.etablissement_id) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    createMutation.mutate({
      nom: formData.nom,
      etablissement_id: parseInt(formData.etablissement_id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Filières</h1>
          <p className="text-muted-foreground">Gérer les filières d'études</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle filière
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une filière</DialogTitle>
              <DialogDescription>
                Créez une nouvelle filière d'études pour organiser les épreuves
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la filière</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Informatique"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="etablissement">Établissement</Label>
                <Select 
                  value={formData.etablissement_id} 
                  onValueChange={(value) => setFormData({ ...formData, etablissement_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    {etablissements.map((etab) => (
                      <SelectItem key={etab.id} value={etab.id.toString()}>
                        {etab.nom}
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
              <Button onClick={handleAddFiliere} disabled={createMutation.isPending}>
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
          {filieres.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Aucune filière trouvée. Créez-en une pour commencer.
            </div>
          ) : (
            filieres.map((filiere) => (
              <Card key={filiere.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {filiere.nom}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(filiere.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {filiere.etablissement?.nom || "Établissement non défini"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                    <span className="text-sm font-medium text-foreground">Établissement</span>
                    <span className="text-sm text-muted-foreground">
                      {filiere.etablissement?.ville || '-'}
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
