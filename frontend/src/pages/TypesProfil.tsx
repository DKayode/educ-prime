import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Tags, Plus, Pencil, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { typeProfilsService } from "@/lib/services/typeProfils.service";
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

interface TypeProfilFormData {
  titre: string;
  sous_titre: string;
  icone: string;
}

// Emojis proposés pour l'icône (l'admin peut aussi coller n'importe quel emoji).
const PRESET_EMOJIS = ["🎓", "📚", "💼", "💰", "🏫", "🧑‍🏫", "👨‍🎓", "👩‍💼", "💡", "🔬", "⚙️", "🎨", "🏆", "🌍", "❤️", "⭐"];

function IconePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border text-2xl">
          {value || "🙂"}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 8))}
          placeholder="Coller un emoji"
          className="w-40"
        />
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Effacer
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESET_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`flex h-8 w-8 items-center justify-center rounded border text-lg hover:bg-muted ${value === emoji ? "ring-2 ring-primary" : ""}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TypesProfil() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingTypeProfil, setEditingTypeProfil] = useState<{ id: number; uuid?: string } & TypeProfilFormData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [formData, setFormData] = useState<TypeProfilFormData>({
    titre: "",
    sous_titre: "",
    icone: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: typeProfilsResponse, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["type-profils", page, limit, debouncedSearchQuery],
    queryFn: () => typeProfilsService.getAll({
      page,
      limit,
      search: debouncedSearchQuery || undefined,
    }),
    placeholderData: keepPreviousData,
  });
  const typeProfils = typeProfilsResponse?.data || [];

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TypeProfilFormData> }) =>
      typeProfilsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["type-profils"] });
      setIsEditDialogOpen(false);
      setEditingTypeProfil(null);
      toast({ title: "Succès", description: "Type de profil mis à jour avec succès" });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du type de profil",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => typeProfilsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["type-profils"] });
      setDeleteId(null);
      toast({ title: "Succès", description: "Type de profil supprimé avec succès" });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la suppression du type de profil",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      await typeProfilsService.create({
        titre: formData.titre,
        sous_titre: formData.sous_titre || undefined,
        icone: formData.icone || undefined,
      });
      toast({ title: "Succès", description: "Type de profil créé avec succès" });

      queryClient.invalidateQueries({ queryKey: ["type-profils"] });
      setIsCreateDialogOpen(false);
      setFormData({ titre: "", sous_titre: "", icone: "" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTypeProfil) return;
    setIsUploading(true);

    try {
      await updateMutation.mutateAsync({
        id: editingTypeProfil.id,
        data: {
          titre: editingTypeProfil.titre,
          sous_titre: editingTypeProfil.sous_titre,
          icone: editingTypeProfil.icone || undefined,
        },
      });
    } catch (error: any) {
      console.error("Update failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const openEditDialog = (typeProfil: any) => {
    setEditingTypeProfil({
      id: typeProfil.id,
      uuid: typeProfil.uuid,
      titre: typeProfil.titre,
      sous_titre: typeProfil.sous_titre || "",
      icone: typeProfil.icone || "",
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading && !isPlaceholderData) {
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
            <Tags className="h-8 w-8" />
            Types de profil
          </h1>
          <p className="text-muted-foreground">Gérer les types de profil pour la personnalisation</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un type de profil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Créer un type de profil</DialogTitle>
                <DialogDescription>
                  Ajouter un nouveau type de profil (titre, sous-titre, icône optionnelle)
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sous_titre">Sous-titre</Label>
                  <Input
                    id="sous_titre"
                    value={formData.sous_titre}
                    onChange={(e) => setFormData({ ...formData, sous_titre: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Icône (emoji)</Label>
                  <IconePicker
                    value={formData.icone}
                    onChange={(v) => setFormData({ ...formData, icone: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
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
          <CardTitle>Liste des types de profil</CardTitle>
          <CardDescription>
            {typeProfils.length} type{typeProfils.length > 1 ? "s" : ""} de profil enregistré
            {typeProfils.length > 1 ? "s" : ""}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre ou sous-titre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {typeProfils.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun type de profil trouvé. Créez-en un pour commencer.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icône</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Sous-titre</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeProfils.map((typeProfil) => (
                    <TableRow key={typeProfil.id}>
                      <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-2xl">
                          {typeProfil.icone || <Tags className="h-5 w-5 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{typeProfil.titre}</TableCell>
                      <TableCell>{typeProfil.sous_titre || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(typeProfil)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(typeProfil.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {typeProfilsResponse?.totalPages !== undefined && typeProfilsResponse.totalPages > 1 && (
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
                    Page {page} sur {typeProfilsResponse.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(typeProfilsResponse.totalPages, p + 1))}
                    disabled={page === typeProfilsResponse.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier le type de profil</DialogTitle>
              <DialogDescription>Mettre à jour les informations du type de profil</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-titre">Titre *</Label>
                <Input
                  id="edit-titre"
                  value={editingTypeProfil?.titre || ""}
                  onChange={(e) =>
                    setEditingTypeProfil(
                      editingTypeProfil ? { ...editingTypeProfil, titre: e.target.value } : null
                    )
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sous_titre">Sous-titre</Label>
                <Input
                  id="edit-sous_titre"
                  value={editingTypeProfil?.sous_titre || ""}
                  onChange={(e) =>
                    setEditingTypeProfil(
                      editingTypeProfil ? { ...editingTypeProfil, sous_titre: e.target.value } : null
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Icône (emoji)</Label>
              {editingTypeProfil && (
                <IconePicker
                  value={editingTypeProfil.icone}
                  onChange={(v) => setEditingTypeProfil({ ...editingTypeProfil, icone: v })}
                />
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isUploading || updateMutation.isPending}>
                {isUploading || updateMutation.isPending ? (
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
              La suppression d'un type de profil retire son assignation des utilisateurs et son
              tagging des contenus (Opportunités, Événements, Forums, Services, Offres). Cette action
              est irréversible.
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
