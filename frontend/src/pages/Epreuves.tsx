import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileText, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { epreuvesService } from "@/lib/services/epreuves.service";
import { filieresService } from "@/lib/services/filieres.service";
import { matieresService } from "@/lib/services/matieres.service";
import { niveauxService } from "@/lib/services/niveaux.service";

export default function Epreuves() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    annee_academique: new Date().getFullYear().toString(),
    filiere_id: "",
    matiere_id: "",
    niveau_etude_id: "",
  });

  const queryClient = useQueryClient();

  const { data: epreuves = [], isLoading, error } = useQuery({
    queryKey: ['epreuves'],
    queryFn: () => epreuvesService.getAll(),
  });

  const { data: filieres = [] } = useQuery({
    queryKey: ['filieres'],
    queryFn: () => filieresService.getAll(),
  });

  const { data: matieres = [] } = useQuery({
    queryKey: ['matieres'],
    queryFn: () => matieresService.getAll(),
  });

  const { data: niveaux = [] } = useQuery({
    queryKey: ['niveaux'],
    queryFn: () => niveauxService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => epreuvesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epreuves'] });
      toast.success("Épreuve créée avec succès");
      setIsDialogOpen(false);
      setFormData({
        titre: "",
        description: "",
        annee_academique: new Date().getFullYear().toString(),
        filiere_id: "",
        matiere_id: "",
        niveau_etude_id: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => epreuvesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epreuves'] });
      toast.success("Épreuve supprimée avec succès");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });

  const handleCreate = () => {
    if (!formData.titre || !formData.annee_academique) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createMutation.mutate(formData);
  };

  const filteredEpreuves = epreuves.filter(
    (epreuve) =>
      epreuve.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      epreuve.filiere?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      epreuve.matiere?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Erreur lors du chargement des épreuves</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Épreuves</h1>
          <p className="text-muted-foreground">Gérer les épreuves d'examens</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Nouvelle épreuve
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une épreuve</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle épreuve d'examen au système
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="titre">Titre de l'épreuve *</Label>
                <Input
                  id="titre"
                  placeholder="Ex: Examen Final Informatique"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Description de l'épreuve"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annee">Année académique *</Label>
                  <Input
                    id="annee"
                    placeholder="2024"
                    value={formData.annee_academique}
                    onChange={(e) => setFormData({ ...formData, annee_academique: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filiere">Filière</Label>
                  <Select
                    value={formData.filiere_id}
                    onValueChange={(value) => setFormData({ ...formData, filiere_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {filieres.map((filiere) => (
                        <SelectItem key={filiere.id} value={filiere.id}>
                          {filiere.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matiere">Matière</Label>
                  <Select
                    value={formData.matiere_id}
                    onValueChange={(value) => setFormData({ ...formData, matiere_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {matieres.map((matiere) => (
                        <SelectItem key={matiere.id} value={matiere.id}>
                          {matiere.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niveau">Niveau d'étude</Label>
                  <Select
                    value={formData.niveau_etude_id}
                    onValueChange={(value) => setFormData({ ...formData, niveau_etude_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {niveaux.map((niveau) => (
                        <SelectItem key={niveau.id} value={niveau.id}>
                          {niveau.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Liste des épreuves ({epreuves.length})</CardTitle>
          <CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, filière ou matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEpreuves.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "Aucune épreuve trouvée" : "Aucune épreuve disponible"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Filière</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEpreuves.map((epreuve) => (
                  <TableRow key={epreuve.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {epreuve.titre}
                      </div>
                    </TableCell>
                    <TableCell>{epreuve.filiere?.nom || "-"}</TableCell>
                    <TableCell>{epreuve.matiere?.nom || "-"}</TableCell>
                    <TableCell>{epreuve.niveau_etude?.nom || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{epreuve.annee_academique}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(epreuve.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(epreuve.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
