import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { filieresService } from "@/lib/services/filieres.service";
import { etablissementsService } from "@/lib/services/etablissements.service";
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
import { cn } from "@/lib/utils";

export default function Filieres() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [etablissementFilter, setEtablissementFilter] = useState("ALL");
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openDialogCombobox, setOpenDialogCombobox] = useState(false);
  const [etablissementSearch, setEtablissementSearch] = useState("");
  const debouncedEtablissementSearch = useDebounce(etablissementSearch, 300);
  const [selectedEtablissement, setSelectedEtablissement] = useState<{ id: number; nom: string } | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [formData, setFormData] = useState({ nom: "", etablissement_id: "" });
  const [editingFiliere, setEditingFiliere] = useState<{ id: number; nom: string; etablissement_id: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: filieresResponse, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['filieres', page, limit, debouncedSearchQuery, etablissementFilter],
    queryFn: () => filieresService.getAll({
      page,
      limit,
      search: debouncedSearchQuery || undefined,
      etablissement: etablissementFilter !== "ALL" ? etablissementFilter : undefined
    }),
    placeholderData: keepPreviousData,
  });
  const filieres = filieresResponse?.data || [];

  const { data: etablissementsResponse } = useQuery({
    queryKey: ['etablissements', debouncedEtablissementSearch],
    queryFn: () => etablissementsService.getAll({
      page: 1,
      limit: 50, // Fetch more for dropdown, or rely on search
      search: debouncedEtablissementSearch || undefined
    }),
  });
  const etablissements = etablissementsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: { nom: string; etablissement_id: number }) =>
      filieresService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filieres'] });
      toast({
        title: "Succès",
        description: "Filière ajoutée avec succès",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'ajout de la filière",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { nom: string; etablissement_id: number } }) =>
      filieresService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filieres'] });
      toast({
        title: "Succès",
        description: "Filière mise à jour avec succès",
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la filière",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => filieresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filieres'] });
      toast({
        title: "Succès",
        description: "Filière supprimée avec succès",
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

  const resetForm = () => {
    setFormData({ nom: "", etablissement_id: "" });
    setEditingFiliere(null);
    setSelectedEtablissement(null);
    setEtablissementSearch("");
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (filiere: any) => {
    setEditingFiliere({
      id: filiere.id,
      nom: filiere.nom,
      etablissement_id: filiere.etablissement?.id?.toString() || "",
    });
    setFormData({
      nom: filiere.nom,
      etablissement_id: filiere.etablissement?.id?.toString() || "",
    });
    setSelectedEtablissement(filiere.etablissement ? {
      id: filiere.etablissement.id,
      nom: filiere.etablissement.nom
    } : null);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nom || !formData.etablissement_id) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      nom: formData.nom,
      etablissement_id: parseInt(formData.etablissement_id),
    };

    if (editingFiliere) {
      updateMutation.mutate({ id: editingFiliere.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
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
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nouvelle filière
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFiliere ? "Modifier la filière" : "Ajouter une filière"}</DialogTitle>
              <DialogDescription>
                {editingFiliere ? "Modifier les informations de la filière" : "Créez une nouvelle filière d'études pour organiser les épreuves"}
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
                <Popover open={openDialogCombobox} onOpenChange={setOpenDialogCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openDialogCombobox}
                      className="w-full justify-between"
                    >
                      {selectedEtablissement ? selectedEtablissement.nom : "Sélectionner un établissement"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher un établissement..."
                        value={etablissementSearch}
                        onValueChange={setEtablissementSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun établissement trouvé.</CommandEmpty>
                        <CommandGroup>
                          {etablissements.map((etab) => (
                            <CommandItem
                              key={etab.id}
                              value={etab.nom}
                              onSelect={() => {
                                setFormData({ ...formData, etablissement_id: etab.id.toString() });
                                setSelectedEtablissement(etab);
                                setOpenDialogCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.etablissement_id === etab.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {etab.nom}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingFiliere ? "Modification..." : "Ajout..."}
                  </>
                ) : (
                  editingFiliere ? "Modifier" : "Ajouter"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && !isPlaceholderData ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Liste des filières</CardTitle>
            <CardDescription>
              {filieres.length} filière{filieres.length > 1 ? "s" : ""} trouvée{filieres.length > 1 ? "s" : ""}
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une filière..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full md:w-[250px] justify-between"
                    >
                      {etablissementFilter === "ALL"
                        ? "Tous les établissements"
                        : etablissementFilter}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Rechercher un établissement..."
                        value={etablissementSearch}
                        onValueChange={setEtablissementSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Aucun établissement trouvé.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="ALL"
                            onSelect={() => {
                              setEtablissementFilter("ALL");
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                etablissementFilter === "ALL" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Tous les établissements
                          </CommandItem>
                          {etablissements.map((etab) => (
                            <CommandItem
                              key={etab.id}
                              value={etab.nom}
                              onSelect={(currentValue) => {
                                setEtablissementFilter(currentValue === etablissementFilter && currentValue !== "ALL" ? "ALL" : currentValue);
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  etablissementFilter === etab.nom ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {etab.nom}
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
            {filieres.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune filière trouvée. Créez-en une pour commencer.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Établissement</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filieres.map((filiere) => (
                    <TableRow key={filiere.id}>
                      <TableCell className="font-medium">{filiere.nom}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{filiere.etablissement?.nom || "Non défini"}</Badge>
                      </TableCell>
                      <TableCell>{filiere.etablissement?.ville || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(filiere)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(filiere.id)}
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
            {filieresResponse?.totalPages !== undefined && filieresResponse.totalPages > 1 && (
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
                  Page {page} sur {filieresResponse.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(filieresResponse.totalPages, p + 1))}
                  disabled={page === filieresResponse.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : La suppression de cette filière n'est possible que si aucun niveau d'étude n'y est associé.
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
    </div >
  );
}
