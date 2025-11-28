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
import { fichiersService } from "@/lib/services/fichiers.service";

export default function Epreuves() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    titre: "",
    duree_minutes: "",
    matiere_id: "",
    date_publication: "",
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
    mutationFn: (data: { file: File; titre: string; duree_minutes: number; matiere_id: number; date_publication?: string }) =>
      fichiersService.uploadEpreuve({
        file: data.file,
        type: 'epreuve',
        matiereId: data.matiere_id,
        epreuveTitre: data.titre,
        dureeMinutes: data.duree_minutes,
        datePublication: data.date_publication,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epreuves'] });
      toast.success("Épreuve créée avec succès");
      setIsDialogOpen(false);
      setFormData({
        titre: "",
        duree_minutes: "",
        matiere_id: "",
        date_publication: "",
      });
      setSelectedFile(null);
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
    if (!formData.titre || !formData.duree_minutes || !formData.matiere_id || !selectedFile) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }
    // Convert to proper types before sending
    createMutation.mutate({
      file: selectedFile,
      titre: formData.titre,
      duree_minutes: parseInt(formData.duree_minutes, 10),
      matiere_id: parseInt(formData.matiere_id, 10),
      date_publication: formData.date_publication || undefined,
    });
  };

  const filteredEpreuves = epreuves.filter(
    (epreuve) =>
      epreuve.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                <Label htmlFor="file">Fichier de l'épreuve *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Fichier sélectionné : {selectedFile.name}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duree">Durée (minutes) *</Label>
                  <Input
                    id="duree"
                    type="number"
                    placeholder="120"
                    value={formData.duree_minutes}
                    onChange={(e) => setFormData({ ...formData, duree_minutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matiere">Matière *</Label>
                  <Select
                    value={formData.matiere_id}
                    onValueChange={(value) => setFormData({ ...formData, matiere_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {matieres.map((matiere) => (
                        <SelectItem key={matiere.id} value={matiere.id.toString()}>
                          {matiere.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_publication">Date de publication (optionnel)</Label>
                <Input
                  id="date_publication"
                  type="datetime-local"
                  value={formData.date_publication}
                  onChange={(e) => setFormData({ ...formData, date_publication: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Si vide, l'épreuve sera publiée immédiatement
                </p>
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
                placeholder="Rechercher par titre ou matière..."
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
                  <TableHead>Matière</TableHead>
                  <TableHead>Professeur</TableHead>
                  <TableHead>Durée (min)</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead>Date publication</TableHead>
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
                    <TableCell>{epreuve.matiere?.nom || "-"}</TableCell>
                    <TableCell>
                      {epreuve.professeur
                        ? `${epreuve.professeur.prenom} ${epreuve.professeur.nom}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{epreuve.duree_minutes} min</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(epreuve.date_creation).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {epreuve.date_publication
                        ? new Date(epreuve.date_publication).toLocaleDateString("fr-FR")
                        : "Immédiate"}
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
