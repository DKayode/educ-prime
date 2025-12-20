import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Plus, Calendar, Loader2, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { niveauxService } from "@/lib/services/niveaux.service";
import { filieresService } from "@/lib/services/filieres.service";
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

export default function Annees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [formData, setFormData] = useState({ nom: "", duree_mois: "", filiere_id: "" });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: niveauxResponse, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['niveaux', debouncedSearchQuery],
    queryFn: () => niveauxService.getAll({ nom: debouncedSearchQuery || undefined }),
    placeholderData: keepPreviousData,
  });
  const niveaux = niveauxResponse?.data || [];

  const { data: filieresResponse } = useQuery({
    queryKey: ['filieres'],
    queryFn: () => filieresService.getAll(),
  });
  const filieres = filieresResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: { nom: string; duree_mois?: number; filiere_id: number }) =>
      niveauxService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      toast({
        title: "Succès",
        description: "Niveau d'étude ajouté avec succès",
      });
      setIsDialogOpen(false);
      setFormData({ nom: "", duree_mois: "", filiere_id: "" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => niveauxService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      toast({
        title: "Succès",
        description: "Niveau d'étude supprimé avec succès",
      });
      setDeleteId(null);
    },
    onError: (error: any) => {
      const message = error.response?.status === 409
        ? error.response.data.message
        : "Erreur lors de la suppression";

      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (!formData.nom || !formData.filiere_id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
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

      <div className="relative w-full md:w-1/3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un niveau d'étude..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && !isPlaceholderData ? (
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
                      onClick={() => setDeleteId(niveau.id)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : La suppression de ce niveau d'étude n'est possible que si aucune matière n'y est associée.
              Si des éléments dépendants existent, la suppression sera bloquée.
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
