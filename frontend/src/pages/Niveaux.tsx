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

import { Plus, Calendar, Loader2, Trash2, Search, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
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

export default function Niveaux() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  /* 
   * Updated state to track selected Filiere NAME instead of ID, 
   * as per user request to filter by `filiere=name`.
   */
  const [selectedFiliereName, setSelectedFiliereName] = useState<string | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [filiereSearch, setFiliereSearch] = useState("");
  const debouncedFiliereSearch = useDebounce(filiereSearch, 300);
  const [formData, setFormData] = useState({ nom: "", duree_mois: "", filiere_ids: [] as string[] });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, selectedFiliereName]);

  const { data: filterFilieresResponse } = useQuery({
    queryKey: ['filterFilieres', debouncedFiliereSearch],
    queryFn: () => filieresService.getAll({
      page: 1,
      limit: 1000,
      search: debouncedFiliereSearch || undefined
    }),
  });
  const filieres = filterFilieresResponse?.data || [];

  /* Dialog specific state */
  const [openDialogCombobox, setOpenDialogCombobox] = useState(false);
  const [dialogFiliereSearch, setDialogFiliereSearch] = useState("");
  const debouncedDialogFiliereSearch = useDebounce(dialogFiliereSearch, 300);
  const [selectedDialogFiliere, setSelectedDialogFiliere] = useState<{ id: number; nom: string } | null>(null);

  const { data: dialogFilieresResponse } = useQuery({
    queryKey: ['filieres_dialog', debouncedDialogFiliereSearch],
    queryFn: () => filieresService.getAll({
      page: 1,
      limit: 1000,
      search: debouncedDialogFiliereSearch || undefined
    }),
    enabled: isDialogOpen
  });
  const dialogFilieres = dialogFilieresResponse?.data || [];

  const { data: niveauxResponse, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['niveaux', page, limit, debouncedSearchQuery, selectedFiliereName],
    queryFn: () => niveauxService.getAll({
      page,
      limit,
      search: debouncedSearchQuery || undefined,
      filiere: selectedFiliereName || undefined
    }),
    placeholderData: keepPreviousData,
  });
  const niveaux = niveauxResponse?.data || [];


  const createMutation = useMutation({
    mutationFn: (data: { nom: string; duree_mois?: number; filiere_id: number }) =>
      niveauxService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "Le niveau a été créé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.response?.data?.message || "Une erreur est survenue lors de la création.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      niveauxService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "Le niveau a été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.response?.data?.message || "Une erreur est survenue lors de la modification.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => niveauxService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niveaux'] });
      setDeleteId(null);
      toast({
        title: "Succès",
        description: "Le niveau a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.response?.data?.message || "Une erreur est survenue lors de la suppression.",
      });
    },
  });

  const handleEdit = (niveau: any) => {
    setEditId(niveau.id);
    setFormData({
      nom: niveau.nom,
      duree_mois: niveau.duree_mois ? niveau.duree_mois.toString() : "",
      filiere_ids: niveau.filiere ? [niveau.filiere.id.toString()] : []
    });
    if (niveau.filiere) {
      const etablissementName = niveau.filiere.etablissement?.nom;
      const acronym = etablissementName ? getAcronym(etablissementName) : "";
      const displayName = etablissementName ? `${niveau.filiere.nom} - ${acronym}` : niveau.filiere.nom;
      setSelectedDialogFiliere({ id: niveau.filiere.id, nom: displayName });
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ nom: "", duree_mois: "", filiere_ids: [] });
    setSelectedDialogFiliere(null);
    setDialogFiliereSearch("");
    setEditId(null);
  };

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Check if at least one filiere is selected
    if (formData.filiere_ids.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation",
        description: "Veuillez sélectionner une filière.",
      });
      return;
    }

    const payloadBase = {
      nom: formData.nom,
      duree_mois: formData.duree_mois ? parseInt(formData.duree_mois) : undefined,
    };

    if (editId) {
      // Edit is single entity update
      updateMutation.mutate({
        id: editId,
        data: { ...payloadBase, filiere_id: parseInt(formData.filiere_ids[0]) }
      });
    } else {
      // Batch creation
      formData.filiere_ids.forEach(filiereId => {
        createMutation.mutate({
          ...payloadBase,
          filiere_id: parseInt(filiereId)
        });
      });
    }
  };




  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Niveaux d'étude</h1>
          <p className="text-muted-foreground">
            {editId ? "Modifier un niveau d'étude" : "Gérer les niveaux d'étude et leurs filières associées"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau niveau
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Modifier le niveau" : "Créer un niveau"}</DialogTitle>
              <DialogDescription>
                {editId ? "Modifiez les informations du niveau d'étude." : "Ajoutez un nouveau niveau d'étude pour une ou plusieurs filières."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du niveau</Label>
                <Input
                  id="nom"
                  placeholder="Ex: Licence 1, Master 2..."
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
                  placeholder="Ex: 9"
                  value={formData.duree_mois}
                  onChange={(e) => setFormData({ ...formData, duree_mois: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="mb-2 block">Filière associée *</Label>
                <div className="flex flex-col gap-2">
                  <Popover open={openDialogCombobox} onOpenChange={setOpenDialogCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDialogCombobox}
                        className="w-full justify-between"
                      >
                        {formData.filiere_ids.length > 0
                          ? (editId && selectedDialogFiliere
                            ? selectedDialogFiliere.nom
                            : `${formData.filiere_ids.length} filière(s) sélectionnée(s)`)
                          : "Sélectionner des filières..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Rechercher une filière..."
                          value={dialogFiliereSearch}
                          onValueChange={setDialogFiliereSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Aucune filière trouvée.</CommandEmpty>
                          <CommandGroup>
                            {!editId && (
                              <CommandItem
                                value="Tout sélectionner"
                                onSelect={() => {
                                  const allIds = dialogFilieres.map(f => f.id.toString());
                                  const areAllSelected = allIds.every(id => formData.filiere_ids.includes(id));

                                  if (areAllSelected) {
                                    setFormData({ ...formData, filiere_ids: [] });
                                  } else {
                                    setFormData({ ...formData, filiere_ids: allIds });
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (dialogFilieres.length > 0 && formData.filiere_ids.length === dialogFilieres.length) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                Tout sélectionner
                              </CommandItem>
                            )}
                            {dialogFilieres.map((filiere) => {
                              const etablissementName = filiere.etablissement?.nom;
                              const acronym = etablissementName ? getAcronym(etablissementName) : "";
                              const displayName = etablissementName ? `${filiere.nom} - ${acronym}` : filiere.nom;

                              return (
                                <CommandItem
                                  key={filiere.id}
                                  value={displayName}
                                  onSelect={() => {
                                    if (editId) {
                                      // Edit mode: strict single select
                                      setFormData({ ...formData, filiere_ids: [filiere.id.toString()] });
                                      setSelectedDialogFiliere({ id: filiere.id, nom: displayName });
                                      setOpenDialogCombobox(false);
                                    } else {
                                      // Create mode: multi select toggle
                                      const currentIds = formData.filiere_ids;
                                      const filiereId = filiere.id.toString();
                                      const newIds = currentIds.includes(filiereId)
                                        ? currentIds.filter(id => id !== filiereId)
                                        : [...currentIds, filiereId];
                                      setFormData({ ...formData, filiere_ids: newIds });
                                      // Keep dialog open for multiple selections
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.filiere_ids.includes(filiere.id.toString()) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {displayName}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    {editId
                      ? "En modification par lot, le nom unique reste inchangé."
                      : "Vous pouvez sélectionner plusieurs filières pour créer ce niveau dans chacune d'elles."}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editId ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des niveaux d'études</CardTitle>
          <CardDescription>
            {niveauxResponse?.total || 0} niveau{(niveauxResponse?.total || 0) > 1 ? "x" : ""} trouvé{(niveauxResponse?.total || 0) > 1 ? "s" : ""}
            <div className="flex items-center space-x-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un niveau..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-[200px] justify-between"
                  >
                    {selectedFiliereName
                      ? selectedFiliereName
                      : "Toutes les filières"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Rechercher une filière..."
                      value={filiereSearch}
                      onValueChange={setFiliereSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Aucune filière trouvée.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="ALL"
                          onSelect={() => {
                            setSelectedFiliereName(null);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !selectedFiliereName ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Toutes les filières
                        </CommandItem>
                        {filieres.map((filiere) => (
                          <CommandItem
                            key={filiere.id}
                            value={filiere.nom}
                            onSelect={(currentValue) => {
                              setSelectedFiliereName(currentValue === selectedFiliereName ? null : currentValue);
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFiliereName === filiere.nom ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {filiere.nom}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : niveaux.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun niveau d'étude trouvé
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Filière</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {niveaux.map((niveau) => (
                    <TableRow key={niveau.id}>
                      <TableCell className="font-medium text-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          {niveau.nom}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{niveau.filiere?.nom || "Non définie"}</Badge>
                      </TableCell>
                      <TableCell>
                        {niveau.duree_mois ? `${niveau.duree_mois} mois` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(niveau)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(niveau.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {niveauxResponse?.totalPages && niveauxResponse.totalPages > 1 && (
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
                    Page {page} sur {niveauxResponse.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(niveauxResponse.totalPages, p + 1))}
                    disabled={page === niveauxResponse.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card >

      {/* Delete Confirmation Dialog */}
      < AlertDialog open={deleteId !== null
      } onOpenChange={(open) => !open && setDeleteId(null)}>
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
      </AlertDialog >
    </div >
  );
}
