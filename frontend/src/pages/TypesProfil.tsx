import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Tags, Plus, Pencil, Trash2, Loader2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { typeProfilsService } from "@/lib/services/typeProfils.service";
import { filesService } from "@/lib/services/files.service";
import { FileImage } from "@/components/FileImage";
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
}

export default function TypesProfil() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingTypeProfil, setEditingTypeProfil] = useState<{ id: number; uuid?: string; icone_path?: string } & TypeProfilFormData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [iconeFile, setIconeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [formData, setFormData] = useState<TypeProfilFormData>({
    titre: "",
    sous_titre: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Safe object URL management for the local file preview.
  useEffect(() => {
    if (!iconeFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(iconeFile);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [iconeFile]);

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
      // Create the row first; backend assigns the uuid we use as the R2 key.
      // Icône is OPTIONAL — create must succeed even when no file is chosen.
      const newTypeProfil = await typeProfilsService.create({
        titre: formData.titre,
        sous_titre: formData.sous_titre || undefined,
      });

      if (iconeFile && newTypeProfil.uuid) {
        try {
          await filesService.uploadFile('type_profils', newTypeProfil.uuid, 'icone', iconeFile);
          toast({ title: "Succès", description: "Type de profil créé avec icône" });
        } catch (uploadError) {
          console.error("Failed to upload icône", uploadError);
          toast({ title: "Attention", description: "Type de profil créé mais échec de l'upload de l'icône" });
        }
      } else {
        toast({ title: "Succès", description: "Type de profil créé avec succès" });
      }

      queryClient.invalidateQueries({ queryKey: ["type-profils"] });
      setIsCreateDialogOpen(false);
      setFormData({ titre: "", sous_titre: "" });
      setIconeFile(null);
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
        },
      });

      // Upload a new icône if the user picked one (optional).
      if (iconeFile && editingTypeProfil.uuid) {
        await filesService.uploadFile('type_profils', editingTypeProfil.uuid, 'icone', iconeFile);
      }
    } catch (error: any) {
      console.error("Update failed", error);
    } finally {
      setIsUploading(false);
      setIconeFile(null);
    }
  };

  const openEditDialog = (typeProfil: any) => {
    setEditingTypeProfil({
      id: typeProfil.id,
      uuid: typeProfil.uuid,
      icone_path: typeProfil.icone_path,
      titre: typeProfil.titre,
      sous_titre: typeProfil.sous_titre || "",
    });
    setIconeFile(null);
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
                  <Label htmlFor="icone">Icône</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="icone"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setIconeFile(file);
                      }}
                      className="cursor-pointer"
                    />
                    {iconeFile && (
                      <div className="relative h-10 w-10">
                        <img
                          src={previewUrl || ""}
                          alt="Preview"
                          className="h-full w-full object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-4 w-4 rounded-full"
                          onClick={() => setIconeFile(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
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
                        <FileImage
                          entity="type_profils"
                          uuid={typeProfil.uuid}
                          slot="icone"
                          url={typeProfil.icone_path}
                          alt={`Icône ${typeProfil.titre}`}
                          className="h-10 w-10 object-contain rounded-md"
                          placeholder={
                            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                              <Tags className="h-5 w-5 text-muted-foreground" />
                            </div>
                          }
                        />
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
              <Label htmlFor="edit-icone">Icône</Label>
              <div className="flex items-center gap-4">
                {iconeFile ? (
                  <div className="relative h-16 w-16">
                    <img
                      src={previewUrl || ""}
                      alt="Preview"
                      className="h-full w-full object-contain rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 p-0"
                      onClick={() => setIconeFile(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : editingTypeProfil?.uuid ? (
                  <div className="relative h-16 w-16">
                    <FileImage
                      entity="type_profils"
                      uuid={editingTypeProfil.uuid}
                      slot="icone"
                      url={editingTypeProfil.icone_path}
                      alt="Icône actuelle"
                      className="h-full w-full object-contain rounded-md border"
                    />
                  </div>
                ) : null}
                <div className="flex-1">
                  <Input
                    id="edit-icone"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setIconeFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
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
