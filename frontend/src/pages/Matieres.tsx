
import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { BookMarked, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react";
import { matieresService } from "@/lib/services/matieres.service";
import { niveauxService } from "@/lib/services/niveaux.service";
import { filieresService } from "@/lib/services/filieres.service";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, getAcronym } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";

interface MatiereFormData {
  nom: string;
  description: string;
  niveau_etude_id: string;
}

export default function Matieres() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingMatiere, setEditingMatiere] = useState<{ id: number } & MatiereFormData | null>(null);
  const [formData, setFormData] = useState<MatiereFormData>({
    nom: "",
    description: "",
    niveau_etude_id: "",
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedFiliereName, setSelectedFiliereName] = useState<string | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [filiereSearch, setFiliereSearch] = useState("");
  const debouncedFiliereSearch = useDebounce(filiereSearch, 300);

  // Dialog state for combobox
  const [openDialogCombobox, setOpenDialogCombobox] = useState(false);
  const [dialogNiveauSearch, setDialogNiveauSearch] = useState("");

  // Cascading Dropdown State
  const [selectedEtablissementId, setSelectedEtablissementId] = useState<string>("");
  const [selectedFiliereId, setSelectedFiliereId] = useState<string>("");

  // Dialog state for edit combobox
  const [openEditDialogCombobox, setOpenEditDialogCombobox] = useState(false);
  const [editDialogNiveauSearch, setEditDialogNiveauSearch] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Filieres for Main Filter
  const { data: filieresResponse } = useQuery({
    queryKey: ['filieres_filter', debouncedFiliereSearch],
    queryFn: () => filieresService.getAll({
      page: 1,
      limit: 1000,
      search: debouncedFiliereSearch || undefined
    }),
  });
  const filieres = filieresResponse?.data || [];

  // Fetch Data for Form (Cascading)
  const { data: etablissementsResponse } = useQuery({
    queryKey: ["etablissements_all"],
    queryFn: () => etablissementsService.getAll({ page: 1, limit: 1000 }),
  });
  const etablissements = etablissementsResponse?.data || [];

  const { data: formFilieresResponse } = useQuery({
    queryKey: ["filieres_form", selectedEtablissementId],
    queryFn: () => {
      return etablissementsService.getFilieres(selectedEtablissementId, {
        page: 1,
        limit: 1000
      });
    },
    enabled: !!selectedEtablissementId,
  });
  const formFilieres = formFilieresResponse?.data || [];

  const { data: formNiveauxResponse } = useQuery({
    queryKey: ["niveaux_form", selectedEtablissementId, selectedFiliereId],
    queryFn: () => {
      return etablissementsService.getNiveaux(selectedEtablissementId, selectedFiliereId, { page: 1, limit: 1000 });
    },
    enabled: !!selectedEtablissementId && !!selectedFiliereId,
  });
  const formNiveaux = formNiveauxResponse?.data || [];

  // Fetch Grouped Matieres
  const { data: groupedMatieresResponse, isLoading } = useQuery({
    queryKey: ["matieres_grouped", page, limit, debouncedSearchQuery],
    queryFn: () => matieresService.getGroupedByName({
      page,
      limit,
      search: debouncedSearchQuery || undefined
    }),
    placeholderData: keepPreviousData,
  });
  const groupedMatieres = groupedMatieresResponse?.data || [];
  const totalPages = groupedMatieresResponse?.totalPages || 1;

  const { data: niveauxResponse } = useQuery({
    queryKey: ["niveaux_all"],
    queryFn: () => niveauxService.getAll({ page: 1, limit: 2000 }),
  });
  const niveaux = niveauxResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => matieresService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matieres_grouped"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsCreateDialogOpen(false);
      setFormData({ nom: "", description: "", niveau_etude_id: "" });
      setSelectedEtablissementId("");
      setSelectedFiliereId("");
      toast({
        title: "Succès",
        description: "Matière créée avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de la matière",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      matieresService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matieres_grouped"] });
      setIsEditDialogOpen(false);
      setEditingMatiere(null);
      toast({
        title: "Succès",
        description: "Matière mise à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour de la matière",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => matieresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matieres_grouped"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
      toast({
        title: "Succès",
        description: "Matière supprimée avec succès",
      });
    },
    onError: (error: any) => {
      const message = error.response?.status === 409
        ? error.response.data.message
        : (error.message || "Échec de la suppression de la matière");

      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // Find the selected niveau to get its filiere_id
    const selectedNiveau = formNiveaux.find(n => n.id.toString() === formData.niveau_etude_id);
    // Fallback search in all niveaux if not in formNiveaux (should be there though)
    const niveauEntity = selectedNiveau || niveaux.find(n => n.id.toString() === formData.niveau_etude_id);

    if (!niveauEntity?.filiere?.id) {
      toast({
        title: "Erreur",
        description: "Le niveau sélectionné n'a pas de filière associée",
        variant: "destructive",
      });
      return;
    }
    // Convert string IDs to numbers before sending to backend
    createMutation.mutate({
      ...formData,
      niveau_etude_id: parseInt(formData.niveau_etude_id, 10) as any,
      filiere_id: niveauEntity.filiere.id as any,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMatiere) {
      // Find the selected niveau to get its filiere_id  
      const selectedNiveau = niveaux.find(n => n.id.toString() === editingMatiere.niveau_etude_id);
      if (!selectedNiveau?.filiere?.id) {
        toast({
          title: "Erreur",
          description: "Le niveau sélectionné n'a pas de filière associée",
          variant: "destructive",
        });
        return;
      }
      updateMutation.mutate({
        id: editingMatiere.id.toString(),
        data: {
          nom: editingMatiere.nom,
          description: editingMatiere.description,
          niveau_etude_id: parseInt(editingMatiere.niveau_etude_id, 10) as any,
          filiere_id: selectedNiveau.filiere.id as any,
        },
      });
    }
  };

  const openEditDialog = (matiere: any) => {
    setEditingMatiere({
      id: matiere.id,
      nom: matiere.nom,
      description: matiere.description || "",
      niveau_etude_id: matiere.niveau_etude?.id?.toString() || "",
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
            <BookMarked className="h-8 w-8" />
            Matières
          </h1>
          <p className="text-muted-foreground">Gérer les matières d'enseignement groupées par nom</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une matière
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Créer une matière</DialogTitle>
                <DialogDescription>Ajouter une nouvelle matière d'enseignement</DialogDescription>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Établissement</Label>
                  <Select
                    value={selectedEtablissementId}
                    onValueChange={(value) => {
                      setSelectedEtablissementId(value);
                      setSelectedFiliereId("");
                      setFormData(prev => ({ ...prev, niveau_etude_id: "" }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un établissement" />
                    </SelectTrigger>
                    <SelectContent>
                      {etablissements.map((etablissement) => (
                        <SelectItem key={etablissement.id} value={etablissement.id.toString()}>
                          {etablissement.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Filière</Label>
                  <Select
                    value={selectedFiliereId}
                    onValueChange={(value) => {
                      setSelectedFiliereId(value);
                      setFormData(prev => ({ ...prev, niveau_etude_id: "" }));
                    }}
                    disabled={!selectedEtablissementId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une filière" />
                    </SelectTrigger>
                    <SelectContent>
                      {formFilieres.map((filiere) => (
                        <SelectItem key={filiere.id} value={filiere.id.toString()}>
                          {filiere.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="niveau">Niveau d'étude *</Label>
                  <Select
                    value={formData.niveau_etude_id}
                    onValueChange={(value) => setFormData({ ...formData, niveau_etude_id: value })}
                    disabled={!selectedFiliereId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un niveau d'étude" />
                    </SelectTrigger>
                    <SelectContent>
                      {formNiveaux.map((niveau) => (
                        <SelectItem key={niveau.id} value={niveau.id.toString()}>
                          {niveau.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une matière..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {groupedMatieres.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
            Aucune matière trouvée. Créez-en une pour commencer.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMatieres.map((group) => (
              <MatiereGroupCard
                key={group.nom}
                group={group}
                onEdit={(matiere) => openEditDialog(matiere)}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  Page {page} sur {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier la matière</DialogTitle>
              <DialogDescription>Mettre à jour les informations de la matière</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nom">Nom *</Label>
                <Input
                  id="edit-nom"
                  value={editingMatiere?.nom || ""}
                  onChange={(e) =>
                    setEditingMatiere(
                      editingMatiere ? { ...editingMatiere, nom: e.target.value } : null
                    )
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMatiere?.description || ""}
                  onChange={(e) =>
                    setEditingMatiere(
                      editingMatiere ? { ...editingMatiere, description: e.target.value } : null
                    )
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-niveau">Niveau d'étude *</Label>
                <Popover open={openEditDialogCombobox} onOpenChange={setOpenEditDialogCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openEditDialogCombobox}
                      className="w-full justify-between"
                    >
                      {editingMatiere?.niveau_etude_id
                        ? niveaux.find((n) => n.id.toString() === editingMatiere.niveau_etude_id)?.nom
                        : "Sélectionner un niveau d'étude"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher un niveau..."
                        value={editDialogNiveauSearch}
                        onValueChange={setEditDialogNiveauSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun niveau trouvé.</CommandEmpty>
                        <CommandGroup>
                          {niveaux.filter(n =>
                            n.nom.toLowerCase().includes(editDialogNiveauSearch.toLowerCase()) ||
                            n.filiere?.nom.toLowerCase().includes(editDialogNiveauSearch.toLowerCase())
                          ).map((niveau) => {
                            const etablissementName = niveau.filiere?.etablissement?.nom;
                            const acronym = etablissementName ? getAcronym(etablissementName) : "";
                            let filiereDisplay = "";
                            if (niveau.filiere?.nom) {
                              filiereDisplay = niveau.filiere.nom;
                              if (acronym) {
                                filiereDisplay += " - " + acronym;
                              }
                            }
                            const displayName = niveau.nom + (filiereDisplay ? " - " + filiereDisplay : "");

                            return (
                              <CommandItem
                                key={niveau.id}
                                value={displayName}
                                onSelect={() => {
                                  setEditingMatiere(editingMatiere ? { ...editingMatiere, niveau_etude_id: niveau.id.toString() } : null);
                                  setOpenEditDialogCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    editingMatiere?.niveau_etude_id === niveau.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {displayName}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
              Attention : La suppression de cette matière n'est possible que si aucune épreuve ou ressource n'y est associée.
              Si des éléments dépendants existent, la suppression sera bloquée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId.toString())}
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
    </div >
  );
}

function MatiereGroupCard({ group, onEdit, onDelete }: { group: any, onEdit: (m: any) => void, onDelete: (id: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.ceil(group.matieres.length / pageSize);
  const paginatedMatieres = group.matieres.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <BookMarked className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{group.nom}</h3>
            <p className="text-sm text-muted-foreground">{group.matieres.length} matière{group.matieres.length > 1 ? 's' : ''} associée{group.matieres.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "Masquer" : "Voir détails"}
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/5 px-6 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Niveau</TableHead>
                <TableHead>Filière</TableHead>
                <TableHead>Établissement</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMatieres.map((matiere: any) => (
                <TableRow key={matiere.id}>
                  <TableCell>
                    <Badge variant="outline">{matiere.niveau_etude?.nom || "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{matiere.niveau_etude?.filiere?.nom || "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {matiere.niveau_etude?.filiere?.etablissement?.nom || "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {matiere.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(matiere)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(matiere.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

