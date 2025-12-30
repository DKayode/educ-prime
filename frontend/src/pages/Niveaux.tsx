import { useState, useEffect, FormEvent } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus, Calendar, Loader2, Trash2, Search, ChevronDown, ChevronRight, ChevronLeft, Pencil, MoreHorizontal, Eye, Link as LinkIcon, Building2 } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Niveaux() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddFiliereDialogOpen, setIsAddFiliereDialogOpen] = useState(false);

  // State for "Add to non-affiliated"
  const [selectedLevelForAdd, setSelectedLevelForAdd] = useState<{ nom: string; existingFilieres: any[] } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [formData, setFormData] = useState({ nom: "", duree_mois: "", filiere_ids: [] as string[] });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  // Delete states
  const [deleteId, setDeleteId] = useState<number | null>(null); // Single delete
  // Group Delete State
  const [deleteGroupNom, setDeleteGroupNom] = useState<string | null>(null);

  const [editData, setEditData] = useState<{ id: number; nom: string; duree_mois: number; filiere_id: number } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch Grouped Niveaux
  const { data: groupedNiveauxResponse, isLoading } = useQuery({
    queryKey: ['niveaux_grouped', page, limit, debouncedSearchQuery],
    queryFn: () => niveauxService.getGroupedByName({
      page,
      limit,
      search: debouncedSearchQuery || undefined
    }),
    placeholderData: keepPreviousData,
  });

  const groupedNiveaux = groupedNiveauxResponse?.data || [];
  const totalGroups = groupedNiveauxResponse?.total || 0;
  const totalPages = groupedNiveauxResponse?.totalPages || 1;

  // Fetch All Filieres for Dialogs
  const { data: allFilieresResponse } = useQuery({
    queryKey: ['filieres_all'],
    queryFn: () => filieresService.getAll({ page: 1, limit: 1000 }),
  });
  const allFilieres = allFilieresResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: { nom: string; duree_mois?: number; filiere_id: number }) =>
      niveauxService.create(data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      niveauxService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux_grouped'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Succès", description: "Mise à jour effectuée avec succès." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.response?.data?.message || "Une erreur est survenue." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => niveauxService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux_grouped'] });
      setDeleteId(null);
      toast({ title: "Succès", description: "Suppression effectuée avec succès." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.response?.data?.message || "Une erreur est survenue." });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (nom: string) => niveauxService.deleteGroup(nom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux_grouped'] });
      setDeleteGroupNom(null);
      toast({ title: "Succès", description: "Groupe de niveaux supprimé avec succès." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.response?.data?.message || "Une erreur est survenue." });
    },
  });

  const resetForm = () => {
    setFormData({ nom: "", duree_mois: "", filiere_ids: [] });
    setEditData(null);
    setSelectedLevelForAdd(null);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenAddFiliereDialog = (levelName: string, existingFilieres: any[]) => {
    resetForm();
    setSelectedLevelForAdd({ nom: levelName, existingFilieres });
    setFormData(prev => ({ ...prev, nom: levelName }));
    setIsAddFiliereDialogOpen(true);
  };

  const handleEditSingle = (niveau: any) => {
    setEditData({
      id: niveau.niveau_id,
      nom: niveau.nom_niveau_snapshot || selectedLevelForAdd?.nom || "",
      duree_mois: niveau.duree_mois,
      filiere_id: niveau.id
    });
    setFormData({
      nom: selectedLevelForAdd?.nom || "",
      duree_mois: niveau.duree_mois,
      filiere_ids: [niveau.id.toString()]
    });
  };

  // Helper to submit forms
  const handleBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.filiere_ids.length === 0) {
      toast({ variant: "destructive", title: "Validation", description: "Sélectionnez au moins une filière." });
      return;
    }

    const promises = formData.filiere_ids.map(filiereId =>
      createMutation.mutateAsync({
        nom: formData.nom,
        duree_mois: formData.duree_mois ? parseInt(formData.duree_mois) : undefined,
        filiere_id: parseInt(filiereId)
      })
    );

    try {
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['niveaux_grouped'] });
      setIsDialogOpen(false);
      setIsAddFiliereDialogOpen(false);
      resetForm();
      toast({ title: "Succès", description: "Niveaux créés avec succès." });
    } catch (error: any) {
      // If any fail, we still refresh what succeeded, but show error.
      // With Promise.all, it rejects on first error.
      console.error(error);
      queryClient.invalidateQueries({ queryKey: ['niveaux_grouped'] });
      toast({ variant: "destructive", title: "Erreur", description: error.response?.data?.message || "Une erreur est survenue lors de la création de certains niveaux." });
    }
  };

  // Logic for the "Non Affiliate" dialog
  // We need to show filieres that are NOT in selectedLevelForAdd.existingFilieres
  const availableFilieres = selectedLevelForAdd
    ? allFilieres.filter(f => !selectedLevelForAdd.existingFilieres.some(ex => ex.id === f.id))
    : allFilieres;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Niveaux d'étude</h1>
          <p className="text-muted-foreground">
            Gestion groupée des niveaux d'étude par nom.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau niveau
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un niveau..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groupedNiveaux.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">Aucun niveau d'étude trouvé.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedNiveaux.map((group) => (
            <NiveauGroupCard
              key={group.nom}
              group={group}
              onAddFiliere={() => handleOpenAddFiliereDialog(group.nom, group.filieres)}
              onDeleteSingle={(id) => setDeleteId(id)}
              onDeleteGroup={(nom) => setDeleteGroupNom(nom)}
              onEditSingle={(niveau) => {
                // Open simple edit dialog for duration/name?
                // For now, let's keep it simple: Add/Delete filiere associations.
                // Edit implies complex logic (rename everywhere? or valid just for this filiere?)
                // Assuming updateMutation exists for single ID.
                // We'll implement a small edit dialog or handle it later.
              }}
            />
          ))}

          {/* Pagination Controls */}
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

      {/* Main Creation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un nouveau niveau</DialogTitle>
            <DialogDescription>
              Définissez un nom et associez-le à une ou plusieurs filières.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du niveau (Ex: Licence 1)</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duree">Durée (mois)</Label>
              <Input
                id="duree"
                type="number"
                value={formData.duree_mois}
                onChange={(e) => setFormData({ ...formData, duree_mois: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Filières associées</Label>
              <MultiSelectFilieres
                filieres={allFilieres}
                selectedIds={formData.filiere_ids}
                onChange={(ids) => setFormData({ ...formData, filiere_ids: ids })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add to Non-Affiliated Dialog */}
      <Dialog open={isAddFiliereDialogOpen} onOpenChange={(open) => { setIsAddFiliereDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter {selectedLevelForAdd?.nom} à des filières</DialogTitle>
            <DialogDescription>
              Sélectionnez les filières auxquelles vous souhaitez ajouter ce niveau.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            {/* Hidden Input for Name */}

            <div className="space-y-2">
              <Label>Filières disponibles (Non associées)</Label>
              <MultiSelectFilieres
                filieres={availableFilieres}
                selectedIds={formData.filiere_ids}
                onChange={(ids) => setFormData({ ...formData, filiere_ids: ids })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duree_add">Durée en mois (Optionnel)</Label>
              <Input
                id="duree_add"
                type="number"
                value={formData.duree_mois}
                onChange={(e) => setFormData({ ...formData, duree_mois: e.target.value })}
                placeholder="Laisser vide pour garder valeur par défaut"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir dissocier ce niveau d'étude de cette filière ?
              Cette action est irréversible si des données (cours, matières) y sont attachées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={deleteGroupNom !== null} onOpenChange={(open) => !open && setDeleteGroupNom(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le groupe "{deleteGroupNom}" ?</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              Attention : Cette action supprimera TOUTES les occurrences de ce niveau dans TOUTES les filières associées.
              <br /><br />
              Cela est irréversible et échouera si des matières sont liées à ces niveaux.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupNom && deleteGroupMutation.mutate(deleteGroupNom)}
              className="bg-destructive text-destructive-foreground"
            >
              Tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-component for Group Card
function NiveauGroupCard({ group, onAddFiliere, onDeleteSingle, onDeleteGroup, onEditSingle }: { group: any, onAddFiliere: () => void, onDeleteSingle: (id: number) => void, onDeleteGroup: (nom: string) => void, onEditSingle: (n: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.ceil(group.filieres.length / pageSize);
  const paginatedFilieres = group.filieres.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card>
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{group.nom}</h3>
            <p className="text-sm text-muted-foreground">{group.filieres.length} filière{group.filieres.length > 1 ? 's' : ''} associée{group.filieres.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "Masquer" : "Voir associées"}
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </Button>
          <Button variant="default" size="sm" onClick={onAddFiliere}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Associer à d'autres filières
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDeleteGroup(group.nom)} className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/5 px-6 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filière</TableHead>
                <TableHead>Établissement</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFilieres.map((filiere: any) => (
                <TableRow key={filiere.niveau_id}>
                  <TableCell className="font-medium">{filiere.nom}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {filiere.etablissement?.nom}
                    </div>
                  </TableCell>
                  <TableCell>{filiere.duree_mois ? `${filiere.duree_mois} mois` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDeleteSingle(filiere.niveau_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

// Sub-component for MultiSelect
function MultiSelectFilieres({ filieres, selectedIds, onChange }: { filieres: any[], selectedIds: string[], onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCount = selectedIds.length;

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = (filtered: any[]) => {
    const allIds = filtered.map(f => f.id.toString());
    const allSelected = allIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter(id => !allIds.includes(id)));
    } else {
      onChange([...new Set([...selectedIds, ...allIds])]);
    }
  };

  const filteredFilieres = filieres.filter(f => f.nom.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {selectedCount > 0 ? `${selectedCount} sélectionnée(s)` : "Sélectionner des filières..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Rechercher..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Aucune filière trouvée.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => handleSelectAll(filteredFilieres)}>
                <Check className={cn("mr-2 h-4 w-4", filteredFilieres.length > 0 && filteredFilieres.every(f => selectedIds.includes(f.id.toString())) ? "opacity-100" : "opacity-0")} />
                Tout sélectionner
              </CommandItem>
              {filteredFilieres.slice(0, 50).map((filiere) => (
                <CommandItem key={filiere.id} value={filiere.nom} onSelect={() => toggleSelection(filiere.id.toString())}>
                  <Check className={cn("mr-2 h-4 w-4", selectedIds.includes(filiere.id.toString()) ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{filiere.nom} - {getAcronym(filiere.etablissement?.nom || "")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
