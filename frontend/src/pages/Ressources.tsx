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
import { Upload, FileText, Trash2, Search, Loader2, BookOpen, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ressourcesService } from "@/lib/services/ressources.service";
import { matieresService } from "@/lib/services/matieres.service";
import { fichiersService } from "@/lib/services/fichiers.service";

export default function Ressources() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);


    const queryClient = useQueryClient();

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("");

    // Update formData to include nombre_pages
    const [formData, setFormData] = useState({
        titre: "",
        type: "" as "" | "Document" | "Quiz" | "Exercices",
        matiere_id: "",
        nombre_pages: "",
    });

    const { data: ressourcesResponse, isLoading, error } = useQuery({
        queryKey: ['ressources'],
        queryFn: () => ressourcesService.getAll(),
    });
    const ressources = ressourcesResponse?.data || [];

    const { data: matieresResponse } = useQuery({
        queryKey: ['matieres'],
        queryFn: () => matieresService.getAll(),
    });
    const matieres = matieresResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: { file: File; titre: string; type: "Document" | "Quiz" | "Exercices"; matiere_id: number; nombre_pages?: string }) =>
            fichiersService.uploadRessource({
                file: data.file,
                type: 'ressource',
                typeRessource: data.type,
                matiereId: data.matiere_id,
                ressourceTitre: data.titre,
                nombrePages: data.nombre_pages ? parseInt(data.nombre_pages, 10) : undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ressources'] });
            toast.success("Ressource créée avec succès");
            setIsDialogOpen(false);
            setFormData({
                titre: "",
                type: "",
                matiere_id: "",
                nombre_pages: "",
            });
            setSelectedFile(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Erreur lors de la création");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => ressourcesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ressources'] });
            toast.success("Ressource supprimée avec succès");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erreur lors de la suppression");
        },
    });

    const handleCreate = () => {
        if (!formData.titre || !formData.type || !formData.matiere_id || !selectedFile) {
            toast.error("Veuillez remplir tous les champs obligatoires et sélectionner un fichier");
            return;
        }
        createMutation.mutate({
            file: selectedFile,
            titre: formData.titre,
            type: formData.type,
            matiere_id: parseInt(formData.matiere_id, 10),
            nombre_pages: formData.nombre_pages,
        });
    };

    const handlePreview = async (ressource: any) => {
        try {
            setPreviewTitle(ressource.titre);
            setIsPreviewOpen(true);
            const blob = await ressourcesService.download(ressource.id);
            const url = window.URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (error) {
            console.error("Preview error:", error);
            toast.error("Erreur lors du chargement de l'aperçu");
            setIsPreviewOpen(false);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const filteredRessources = ressources.filter(
        (ressource) =>
            ressource.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ressource.matiere?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ressource.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTypeBadgeVariant = (type: string) => {
        switch (type) {
            case 'Quiz':
                return 'default';
            case 'Exercices':
                return 'secondary';
            case 'Document':
                return 'outline';
            default:
                return 'outline';
        }
    };

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
                <p className="text-destructive">Erreur lors du chargement des ressources</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="h-8 w-8" />
                        Ressources Pédagogiques
                    </h1>
                    <p className="text-muted-foreground">Gérer les ressources d'enseignement</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Upload className="h-4 w-4" />
                            Nouvelle ressource
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Créer une ressource</DialogTitle>
                            <DialogDescription>
                                Ajoutez une nouvelle ressource pédagogique au système
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="titre">Titre de la ressource *</Label>
                                <Input
                                    id="titre"
                                    placeholder="Ex: Cours Chapitre 1"
                                    value={formData.titre}
                                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="file">Fichier de la ressource *</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
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
                                    <Label htmlFor="type">Type de ressource *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value: "Document" | "Quiz" | "Exercices") => setFormData({ ...formData, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Document">Document</SelectItem>
                                            <SelectItem value="Quiz">Quiz</SelectItem>
                                            <SelectItem value="Exercices">Exercices</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pages">Nombre de pages</Label>
                                    <Input
                                        id="pages"
                                        type="number"
                                        placeholder="Ex: 5"
                                        value={formData.nombre_pages}
                                        onChange={(e) => setFormData({ ...formData, nombre_pages: e.target.value })}
                                    />
                                </div>
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
                    <CardTitle>Liste des ressources ({ressources.length})</CardTitle>
                    <CardDescription>
                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par titre, matière ou type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredRessources.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">
                                {searchQuery ? "Aucune ressource trouvée" : "Aucune ressource disponible"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Matière</TableHead>
                                    <TableHead>Pages</TableHead>
                                    <TableHead>Téléch.</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRessources.map((ressource) => (
                                    <TableRow key={ressource.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {ressource.titre}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getTypeBadgeVariant(ressource.type) as any}>
                                                {ressource.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{ressource.matiere?.nom || "-"}</TableCell>
                                        <TableCell>{ressource.nombre_pages || "-"}</TableCell>
                                        <TableCell>{ressource.nombre_telechargements || 0}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(ressource.date_creation).toLocaleDateString("fr-FR")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={!ressource.url}
                                                    className="h-8 w-8 text-blue-500 hover:text-blue-600"
                                                    onClick={() => handlePreview(ressource)}
                                                    title="Visualiser"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => deleteMutation.mutate(ressource.id.toString())}
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

            <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && closePreview()}>
                <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>{previewTitle}</DialogTitle>
                        <DialogDescription>
                            Aperçu du fichier
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 h-full min-h-[60vh] w-full rounded-md border bg-muted/50">
                        {previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full rounded-md"
                                title="Aperçu du fichier"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
