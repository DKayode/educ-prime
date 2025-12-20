import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Building2, Plus, Pencil, Trash2, Loader2, Search, Upload, X } from "lucide-react";
import { etablissementsService } from "@/lib/services/etablissements.service";
import { fichiersService } from "@/lib/services/fichiers.service";
import { API_URL } from "@/lib/api";
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

interface EtablissementFormData {
  nom: string;
  ville: string;
  code_postal: string;
  logo?: string;
}

export default function Etablissements() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingEtablissement, setEditingEtablissement] = useState<{ id: number } & EtablissementFormData | null>(null);
  const [nomFilter, setNomFilter] = useState("");
  const [villeFilter, setVilleFilter] = useState("");
  const debouncedNomFilter = useDebounce(nomFilter, 500);
  const debouncedVilleFilter = useDebounce(villeFilter, 500);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<EtablissementFormData>({
    nom: "",
    ville: "",
    code_postal: "",
    logo: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Safe object URL management
  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setPreviewUrl(objectUrl);

    // Cleanup function to revoke the URL when component unmounts or file changes
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: etablissementsResponse, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["etablissements", debouncedNomFilter, debouncedVilleFilter],
    queryFn: () => etablissementsService.getAll({
      nom: debouncedNomFilter || undefined,
      ville: debouncedVilleFilter || undefined
    }),
    placeholderData: keepPreviousData,
  });
  const etablissements = etablissementsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: EtablissementFormData) => etablissementsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsCreateDialogOpen(false);
      setIsCreateDialogOpen(false);
      setFormData({ nom: "", ville: "", code_postal: "", logo: "" });
      setLogoFile(null);
      toast({
        title: "Succès",
        description: "Établissement créé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de l'établissement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EtablissementFormData> }) =>
      etablissementsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      setIsEditDialogOpen(false);
      setEditingEtablissement(null);
      toast({
        title: "Succès",
        description: "Établissement mis à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour de l'établissement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => etablissementsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteId(null);
      toast({
        title: "Succès",
        description: "Établissement supprimé avec succès",
      });
    },
    onError: (error: any) => {
      const message = error.response?.status === 409
        ? error.response.data.message
        : (error.message || "Échec de la suppression de l'établissement");

      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    let uploadedLogoUrl = "";

    try {
      // Create user first
      const newEtablissement = await etablissementsService.create(formData);

      if (logoFile) {
        try {
          const uploadResult = await fichiersService.uploadImage({
            file: logoFile,
            type: 'ETABLISSEMENT', // Need to ensure this type exists or use a generic one
            entityId: newEtablissement.id,
            entitySubtype: 'logo',
          });
          uploadedLogoUrl = uploadResult.url;

          await etablissementsService.update(newEtablissement.id, {
            ...formData, // Keep existing data
            logo: uploadedLogoUrl
          });

          toast({
            title: "Succès",
            description: "Établissement créé avec logo",
          });
        } catch (uploadError) {
          console.error("Failed to upload logo", uploadError);
          toast({
            title: "Attention",
            description: "Établissement créé mais échec de l'upload du logo",
            // variant: "warning", // Not supported
          });
        }
      } else {
        toast({
          title: "Succès",
          description: "Établissement créé avec succès",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["etablissements"] });
      setIsCreateDialogOpen(false);
      setFormData({ nom: "", ville: "", code_postal: "", logo: "" });
      setLogoFile(null);

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEtablissement) return;
    setIsUploading(true);

    try {
      let currentLogoUrl = editingEtablissement.logo;
      const oldLogo = editingEtablissement.logo;

      if (logoFile) {
        const uploadResult = await fichiersService.uploadImage({
          file: logoFile,
          type: 'ETABLISSEMENT',
          entityId: editingEtablissement.id,
          entitySubtype: 'logo',
        });
        currentLogoUrl = uploadResult.url;
      }

      await updateMutation.mutateAsync({
        id: editingEtablissement.id,
        data: {
          nom: editingEtablissement.nom,
          ville: editingEtablissement.ville,
          code_postal: editingEtablissement.code_postal,
          logo: currentLogoUrl,
        },
      });

      // Cleanup old logo after successful update
      if (logoFile && oldLogo && oldLogo !== currentLogoUrl) {
        try {
          await fichiersService.deleteFile(oldLogo);
        } catch (e) {
          console.error("Failed to delete old logo", e);
        }
      }
    } catch (error: any) {
      // Error handled by mutation onError or here if needed
      console.error("Update failed", error);
    } finally {
      setIsUploading(false);
      setLogoFile(null);
    }
  };

  const openEditDialog = (etablissement: any) => {
    setEditingEtablissement({
      id: etablissement.id,
      nom: etablissement.nom,
      ville: etablissement.ville || "",
      code_postal: etablissement.code_postal || "",
      logo: etablissement.logo || "",
    });
    setLogoFile(null);
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
            <Building2 className="h-8 w-8" />
            Établissements
          </h1>
          <p className="text-muted-foreground">Gérer les établissements d'enseignement</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un établissement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Créer un établissement</DialogTitle>
                <DialogDescription>
                  Ajouter un nouvel établissement d'enseignement
                </DialogDescription>
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
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code_postal">Code postal</Label>
                  <Input
                    id="code_postal"
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="logo">Logo</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setLogoFile(file);
                      }}
                      className="cursor-pointer"
                    />
                    {logoFile && (
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
                          onClick={() => setLogoFile(null)}
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
          <CardTitle>Liste des établissements</CardTitle>
          <CardDescription>
            {etablissements.length} établissement{etablissements.length > 1 ? "s" : ""} enregistré
            {etablissements.length > 1 ? "s" : ""}
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom..."
                  value={nomFilter}
                  onChange={(e) => setNomFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par ville..."
                  value={villeFilter}
                  onChange={(e) => setVilleFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {etablissements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun établissement trouvé. Créez-en un pour commencer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Code postal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {etablissements.map((etablissement) => (
                  <TableRow key={etablissement.id}>
                    <TableCell>
                      {etablissement.logo ? (
                        <img
                          src={`${API_URL}/etablissements/${etablissement.id}/logo`}
                          alt={`Logo ${etablissement.nom}`}
                          className="h-10 w-10 object-contain rounded-md"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{etablissement.nom}</TableCell>
                    <TableCell>{etablissement.ville || "—"}</TableCell>
                    <TableCell>{etablissement.code_postal || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(etablissement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(etablissement.id)}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier l'établissement</DialogTitle>
              <DialogDescription>Mettre à jour les informations de l'établissement</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nom">Nom *</Label>
                <Input
                  id="edit-nom"
                  value={editingEtablissement?.nom || ""}
                  onChange={(e) =>
                    setEditingEtablissement(
                      editingEtablissement ? { ...editingEtablissement, nom: e.target.value } : null
                    )
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ville">Ville</Label>
                <Input
                  id="edit-ville"
                  value={editingEtablissement?.ville || ""}
                  onChange={(e) =>
                    setEditingEtablissement(
                      editingEtablissement ? { ...editingEtablissement, ville: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code_postal">Code postal</Label>
                <Input
                  id="edit-code_postal"
                  value={editingEtablissement?.code_postal || ""}
                  onChange={(e) =>
                    setEditingEtablissement(
                      editingEtablissement
                        ? { ...editingEtablissement, code_postal: e.target.value }
                        : null
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-logo">Logo</Label>
              <div className="flex items-center gap-4">
                {logoFile ? (
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
                      onClick={() => setLogoFile(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : editingEtablissement?.logo ? (
                  <div className="relative h-16 w-16">
                    <img
                      src={`${API_URL}/etablissements/${editingEtablissement.id}/logo`}
                      alt="Current Logo"
                      className="h-full w-full object-contain rounded-md border"
                    />
                  </div>
                ) : null}
                <div className="flex-1">
                  <Input
                    id="edit-logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLogoFile(e.target.files[0]);
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
              Attention : La suppression de cet établissement n'est possible que si aucune filière n'y est associée.
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
