import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { FileText, Plus, Pencil, Trash2, Loader2, Search, Eye, ChevronLeft, ChevronRight, Check, ChevronsUpDown } from "lucide-react";
import {
    typesExamenService,
    seriesService,
    matieresExamenService,
    filieresExamenService,
    examensNationauxService,
    type ExamenNational,
} from "@/lib/services/examens-nationaux.service";
import { filesService } from "@/lib/services/files.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Ref = { id: number; nom: string };

const SECTION_NONE = "NONE";

// Best-effort mirror of the server-side titre composition, for a live read-only
// preview: "<type> - <série?> - <filière?> - <matière?> - <année>".
function composeTitre(type: Ref | null, serie: Ref | null, filiere: Ref | null, matiere: Ref | null, annee: string) {
    return [type?.nom, serie?.nom, filiere?.nom, matiere?.nom, annee || undefined].filter(Boolean).join(" - ");
}

// Searchable single-select with an inline "+ Créer". `search` is lifted so the
// parent query refetches server-side; open + the create input are local.
function CascadeCombobox({
    label, placeholder, searchPlaceholder, emptyText, createPlaceholder,
    disabled, options, selected, onSelect, search, onSearchChange, onCreate, isCreating,
}: {
    label: string;
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
    createPlaceholder: string;
    disabled?: boolean;
    options: Ref[];
    selected: Ref | null;
    onSelect: (opt: Ref) => void;
    search: string;
    onSearchChange: (v: string) => void;
    onCreate: (nom: string) => void;
    isCreating: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [createInput, setCreateInput] = useState("");

    const submitCreate = () => {
        const nom = createInput.trim();
        if (!nom) return;
        onCreate(nom);
        setCreateInput("");
    };

    return (
        <div className="grid gap-2 min-w-0">
            <Label>{label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between font-normal min-w-0">
                        <span className={cn("truncate min-w-0 text-left", selected ? "" : "text-muted-foreground")}>{selected ? selected.nom : placeholder}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[16rem] p-0">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={onSearchChange} />
                        <CommandList style={{ maxHeight: "min(18rem, calc(var(--radix-popover-content-available-height) - 6rem))" }}>
                            <CommandEmpty>{emptyText}</CommandEmpty>
                            <CommandGroup>
                                {options.map((o) => (
                                    <CommandItem key={o.id} value={o.nom} className="items-start" onSelect={() => { onSelect(o); setOpen(false); }}>
                                        <Check className={cn("mr-2 mt-0.5 h-4 w-4 shrink-0", selected?.id === o.id ? "opacity-100" : "opacity-0")} />
                                        <span className="whitespace-normal break-words">{o.nom}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        <div className="flex items-center gap-2 border-t p-2">
                            <Input
                                value={createInput}
                                onChange={(e) => setCreateInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitCreate(); } }}
                                placeholder={createPlaceholder}
                                className="h-8"
                            />
                            <Button type="button" size="sm" variant="secondary" className="shrink-0" disabled={!createInput.trim() || isCreating} onClick={submitCreate}>
                                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />Créer</>}
                            </Button>
                        </div>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default function ExamensNationaux() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<ExamenNational | null>(null);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // ---- Create-dialog cascade state ------------------------------------
    const [cType, setCType] = useState<Ref | null>(null);
    const [cSerie, setCSerie] = useState<Ref | null>(null);
    const [cMatiere, setCMatiere] = useState<Ref | null>(null);
    const [cFiliere, setCFiliere] = useState<Ref | null>(null);
    const [cSection, setCSection] = useState<string>(SECTION_NONE);
    const [cAnnee, setCAnnee] = useState<string>("");

    const [cTypeSearch, setCTypeSearch] = useState("");
    const [cSerieSearch, setCSerieSearch] = useState("");
    const [cMatiereSearch, setCMatiereSearch] = useState("");
    const [cFiliereSearch, setCFiliereSearch] = useState("");
    const dCTypeSearch = useDebounce(cTypeSearch, 300);
    const dCSerieSearch = useDebounce(cSerieSearch, 300);
    const dCMatiereSearch = useDebounce(cMatiereSearch, 300);
    const dCFiliereSearch = useDebounce(cFiliereSearch, 300);

    // ---- Edit-dialog cascade state --------------------------------------
    const [eTypeSearch, setETypeSearch] = useState("");
    const [eSerieSearch, setESerieSearch] = useState("");
    const [eMatiereSearch, setEMatiereSearch] = useState("");
    const [eFiliereSearch, setEFiliereSearch] = useState("");
    const dETypeSearch = useDebounce(eTypeSearch, 300);
    const dESerieSearch = useDebounce(eSerieSearch, 300);
    const dEMatiereSearch = useDebounce(eMatiereSearch, 300);
    const dEFiliereSearch = useDebounce(eFiliereSearch, 300);

    // ---- Lookup queries: create -----------------------------------------
    const { data: cTypesResp } = useQuery({
        queryKey: ["types-examen-lookup", dCTypeSearch],
        queryFn: () => typesExamenService.getAll({ search: dCTypeSearch || undefined, limit: 50 }),
        enabled: isCreateDialogOpen,
    });
    const cTypes = cTypesResp?.data || [];

    const { data: cSeriesResp } = useQuery({
        queryKey: ["series-lookup", cType?.id, dCSerieSearch],
        queryFn: () => seriesService.getAll({ search: dCSerieSearch || undefined, type_examen: cType!.id, limit: 50 }),
        enabled: isCreateDialogOpen && !!cType,
    });
    const cSeries = cSeriesResp?.data || [];

    const { data: cMatieresResp } = useQuery({
        queryKey: ["matieres-examen-lookup", cType?.id, dCMatiereSearch],
        queryFn: () => matieresExamenService.getAll({ search: dCMatiereSearch || undefined, type_examen: cType!.id, limit: 50 }),
        enabled: isCreateDialogOpen && !!cType,
    });
    const cMatieres = cMatieresResp?.data || [];

    const { data: cFilieresResp } = useQuery({
        queryKey: ["filieres-examen-lookup", cType?.id, dCFiliereSearch],
        queryFn: () => filieresExamenService.getAll({ search: dCFiliereSearch || undefined, type_examen: cType!.id, limit: 50 }),
        enabled: isCreateDialogOpen && !!cType,
    });
    const cFilieres = cFilieresResp?.data || [];

    // ---- Lookup queries: edit -------------------------------------------
    const { data: eTypesResp } = useQuery({
        queryKey: ["types-examen-lookup", dETypeSearch],
        queryFn: () => typesExamenService.getAll({ search: dETypeSearch || undefined, limit: 50 }),
        enabled: isEditDialogOpen,
    });
    const eTypes = eTypesResp?.data || [];

    const eTypeId = editingItem?.type_examen_id;
    const { data: eSeriesResp } = useQuery({
        queryKey: ["series-lookup", eTypeId, dESerieSearch],
        queryFn: () => seriesService.getAll({ search: dESerieSearch || undefined, type_examen: eTypeId!, limit: 50 }),
        enabled: isEditDialogOpen && !!eTypeId,
    });
    const eSeries = eSeriesResp?.data || [];

    const { data: eMatieresResp } = useQuery({
        queryKey: ["matieres-examen-lookup", eTypeId, dEMatiereSearch],
        queryFn: () => matieresExamenService.getAll({ search: dEMatiereSearch || undefined, type_examen: eTypeId!, limit: 50 }),
        enabled: isEditDialogOpen && !!eTypeId,
    });
    const eMatieres = eMatieresResp?.data || [];

    const { data: eFilieresResp } = useQuery({
        queryKey: ["filieres-examen-lookup", eTypeId, dEFiliereSearch],
        queryFn: () => filieresExamenService.getAll({ search: dEFiliereSearch || undefined, type_examen: eTypeId!, limit: 50 }),
        enabled: isEditDialogOpen && !!eTypeId,
    });
    const eFilieres = eFilieresResp?.data || [];

    // ---- List query ------------------------------------------------------
    const { data: itemsResponse, isLoading, isPlaceholderData } = useQuery({
        queryKey: ["examens-nationaux", debouncedSearch, page, limit],
        queryFn: () => examensNationauxService.getAll({
            search: debouncedSearch || undefined,
            page,
            limit,
        }),
        placeholderData: keepPreviousData,
    });
    const items = itemsResponse?.data || [];
    const totalPages = itemsResponse?.totalPages || 1;

    // ---- Inline-create mutations ----------------------------------------
    const createTypeMutation = useMutation({
        mutationFn: (nom: string) => typesExamenService.create({ nom }),
    });
    const createSerieMutation = useMutation({
        mutationFn: ({ nom, type_examen_id }: { nom: string; type_examen_id: number }) => seriesService.create({ nom, type_examen_id }),
    });
    const createMatiereMutation = useMutation({
        mutationFn: ({ nom, type_examen_id }: { nom: string; type_examen_id: number }) => matieresExamenService.create({ nom, type_examen_id }),
    });
    const createFiliereMutation = useMutation({
        mutationFn: ({ nom, type_examen_id }: { nom: string; type_examen_id: number }) => filieresExamenService.create({ nom, type_examen_id }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => examensNationauxService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["examens-nationaux"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setDeleteId(null);
            toast({ title: "Succès", description: "Examen national supprimé avec succès" });
        },
        onError: (error: any) => {
            toast({ title: "Erreur", description: error.message || "Échec de la suppression", variant: "destructive" });
        },
    });

    // ---- Inline-create handlers -----------------------------------------
    const handleCreateType = async (nom: string, mode: "create" | "edit") => {
        try {
            const created = await createTypeMutation.mutateAsync(nom);
            queryClient.invalidateQueries({ queryKey: ["types-examen-lookup"] });
            if (mode === "create") {
                setCType({ id: created.id, nom: created.nom });
                setCSerie(null); setCMatiere(null); setCFiliere(null);
            } else if (editingItem) {
                setEditingItem({
                    ...editingItem,
                    type_examen_id: created.id, type_examen: created,
                    serie_id: null, serie: null,
                    matiere_examen_id: null, matiere_examen: null,
                    filiere_examen_id: null, filiere_examen: null,
                });
            }
            toast({ title: "Succès", description: "Type d'examen créé" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création du type", variant: "destructive" });
        }
    };

    const handleCreateSerie = async (nom: string, mode: "create" | "edit") => {
        const typeId = mode === "create" ? cType?.id : editingItem?.type_examen_id;
        if (!typeId) return;
        try {
            const created = await createSerieMutation.mutateAsync({ nom, type_examen_id: typeId });
            queryClient.invalidateQueries({ queryKey: ["series-lookup"] });
            if (mode === "create") setCSerie({ id: created.id, nom: created.nom });
            else if (editingItem) setEditingItem({ ...editingItem, serie_id: created.id, serie: created });
            toast({ title: "Succès", description: "Série créée" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création de la série", variant: "destructive" });
        }
    };

    const handleCreateMatiere = async (nom: string, mode: "create" | "edit") => {
        const typeId = mode === "create" ? cType?.id : editingItem?.type_examen_id;
        if (!typeId) return;
        try {
            const created = await createMatiereMutation.mutateAsync({ nom, type_examen_id: typeId });
            queryClient.invalidateQueries({ queryKey: ["matieres-examen-lookup"] });
            if (mode === "create") setCMatiere({ id: created.id, nom: created.nom });
            else if (editingItem) setEditingItem({ ...editingItem, matiere_examen_id: created.id, matiere_examen: created });
            toast({ title: "Succès", description: "Matière créée" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création de la matière", variant: "destructive" });
        }
    };

    const handleCreateFiliere = async (nom: string, mode: "create" | "edit") => {
        const typeId = mode === "create" ? cType?.id : editingItem?.type_examen_id;
        if (!typeId) return;
        try {
            const created = await createFiliereMutation.mutateAsync({ nom, type_examen_id: typeId });
            queryClient.invalidateQueries({ queryKey: ["filieres-examen-lookup"] });
            if (mode === "create") setCFiliere({ id: created.id, nom: created.nom });
            else if (editingItem) setEditingItem({ ...editingItem, filiere_examen_id: created.id, filiere_examen: created });
            toast({ title: "Succès", description: "Filière créée" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création de la filière", variant: "destructive" });
        }
    };

    // ---- File input ------------------------------------------------------
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const resetCreateForm = () => {
        setCType(null); setCSerie(null); setCMatiere(null); setCFiliere(null);
        setCSection(SECTION_NONE); setCAnnee("");
        setCTypeSearch(""); setCSerieSearch(""); setCMatiereSearch(""); setCFiliereSearch("");
        setSelectedFile(null);
    };

    // ---- Create submit ---------------------------------------------------
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cType || !cAnnee) {
            toast({ title: "Erreur", description: "Le type et l'année sont requis", variant: "destructive" });
            return;
        }
        if (!cMatiere && !cFiliere) {
            toast({ title: "Erreur", description: "Au moins une matière ou une filière est requise", variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            // Step 1: create the row. titre is composed server-side — never sent.
            const created = await examensNationauxService.create({
                type_examen_id: cType.id,
                serie_id: cSerie?.id,
                matiere_examen_id: cMatiere?.id,
                filiere_examen_id: cFiliere?.id,
                section: cSection !== SECTION_NONE ? cSection : undefined,
                annee: parseInt(cAnnee),
            });

            // Step 2: PUT the PDF to R2 through the proxy (same slot as concours).
            if (selectedFile && created.uuid) {
                try {
                    await filesService.uploadFile("examens_nationaux", created.uuid, "file", selectedFile);
                } catch (uploadError: any) {
                    await examensNationauxService.delete(created.id);
                    throw new Error("Échec de l'upload du fichier: " + (uploadError.message || "Erreur inconnue"));
                }
            }

            queryClient.invalidateQueries({ queryKey: ["examens-nationaux"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            setIsCreateDialogOpen(false);
            resetCreateForm();
            toast({ title: "Succès", description: "Examen national créé avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la création", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    // ---- Edit submit -----------------------------------------------------
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;
        if (!editingItem.type_examen_id || !editingItem.annee) {
            toast({ title: "Erreur", description: "Le type et l'année sont requis", variant: "destructive" });
            return;
        }
        if (!editingItem.matiere_examen_id && !editingItem.filiere_examen_id) {
            toast({ title: "Erreur", description: "Au moins une matière ou une filière est requise", variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            await examensNationauxService.update(editingItem.id, {
                type_examen_id: editingItem.type_examen_id,
                serie_id: editingItem.serie_id ?? undefined,
                matiere_examen_id: editingItem.matiere_examen_id ?? undefined,
                filiere_examen_id: editingItem.filiere_examen_id ?? undefined,
                section: editingItem.section ?? undefined,
                annee: editingItem.annee,
            });

            if (selectedFile && editingItem.uuid) {
                await filesService.uploadFile("examens_nationaux", editingItem.uuid, "file", selectedFile);
            }

            queryClient.invalidateQueries({ queryKey: ["examens-nationaux"] });
            setIsEditDialogOpen(false);
            setEditingItem(null);
            setSelectedFile(null);
            toast({ title: "Succès", description: "Examen national mis à jour avec succès" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Échec de la mise à jour", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const openEdit = (item: ExamenNational) => {
        setEditingItem(item);
        setSelectedFile(null);
        setETypeSearch(""); setESerieSearch(""); setEMatiereSearch(""); setEFiliereSearch("");
        setIsEditDialogOpen(true);
    };

    // Open the file: private slot → presigned download-url; fall back to
    // the row's public path / legacy url if present.
    const handleView = async (item: ExamenNational) => {
        try {
            if (item.uuid) {
                const dl = await filesService.getDownloadUrl("examens_nationaux", item.uuid, "file");
                if (dl?.url) { window.open(dl.url, "_blank", "noopener"); return; }
            }
            const fallback = item.file_path || item.url;
            if (fallback) { window.open(fallback, "_blank", "noopener"); return; }
            toast({ title: "Aucun fichier", description: "Aucun fichier n'est associé à cet examen", variant: "destructive" });
        } catch (error: any) {
            toast({ title: "Erreur", description: error.message || "Impossible d'ouvrir le fichier", variant: "destructive" });
        }
    };

    const composedCreateTitre = composeTitre(cType, cSerie, cFiliere, cMatiere, cAnnee);
    const composedEditTitre = editingItem
        ? composeTitre(
            editingItem.type_examen ? { id: editingItem.type_examen.id, nom: editingItem.type_examen.nom } : null,
            editingItem.serie ? { id: editingItem.serie.id, nom: editingItem.serie.nom } : null,
            editingItem.filiere_examen ? { id: editingItem.filiere_examen.id, nom: editingItem.filiere_examen.nom } : null,
            editingItem.matiere_examen ? { id: editingItem.matiere_examen.id, nom: editingItem.matiere_examen.nom } : null,
            editingItem.annee ? editingItem.annee.toString() : "",
        )
        : "";

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
                        <FileText className="h-8 w-8" />
                        Examens Nationaux
                    </h1>
                    <p className="text-muted-foreground">Gérer les examens nationaux</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetCreateForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Ajouter
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Créer un examen national</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2 min-w-0">
                                    <Label>Titre (généré automatiquement)</Label>
                                    <Input
                                        readOnly
                                        value={composedCreateTitre}
                                        placeholder="Sélectionnez un type, une matière ou une filière, et une année"
                                        className="bg-muted text-muted-foreground"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CascadeCombobox
                                        label="Type d'examen *"
                                        placeholder="Sélectionner un type"
                                        searchPlaceholder="Rechercher un type..."
                                        emptyText="Aucun type trouvé."
                                        createPlaceholder="Nouveau type"
                                        options={cTypes.map((t) => ({ id: t.id, nom: t.nom }))}
                                        selected={cType}
                                        onSelect={(opt) => { setCType(opt); setCSerie(null); setCMatiere(null); setCFiliere(null); }}
                                        search={cTypeSearch}
                                        onSearchChange={setCTypeSearch}
                                        onCreate={(nom) => handleCreateType(nom, "create")}
                                        isCreating={createTypeMutation.isPending}
                                    />
                                    <CascadeCombobox
                                        label="Série (optionnel)"
                                        placeholder={cType ? "Sélectionner une série" : "Choisir un type d'abord"}
                                        searchPlaceholder="Rechercher une série..."
                                        emptyText="Aucune série trouvée."
                                        createPlaceholder="Nouvelle série"
                                        disabled={!cType}
                                        options={cSeries.map((s) => ({ id: s.id, nom: s.nom }))}
                                        selected={cSerie}
                                        onSelect={(opt) => setCSerie(opt)}
                                        search={cSerieSearch}
                                        onSearchChange={setCSerieSearch}
                                        onCreate={(nom) => handleCreateSerie(nom, "create")}
                                        isCreating={createSerieMutation.isPending}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground -mb-2">Renseignez au moins une matière <b>ou</b> une filière.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <CascadeCombobox
                                        label="Matière (optionnel)"
                                        placeholder={cType ? "Sélectionner une matière" : "Choisir un type d'abord"}
                                        searchPlaceholder="Rechercher une matière..."
                                        emptyText="Aucune matière trouvée."
                                        createPlaceholder="Nouvelle matière"
                                        disabled={!cType}
                                        options={cMatieres.map((m) => ({ id: m.id, nom: m.nom }))}
                                        selected={cMatiere}
                                        onSelect={(opt) => setCMatiere(opt)}
                                        search={cMatiereSearch}
                                        onSearchChange={setCMatiereSearch}
                                        onCreate={(nom) => handleCreateMatiere(nom, "create")}
                                        isCreating={createMatiereMutation.isPending}
                                    />
                                    <CascadeCombobox
                                        label="Filière (optionnel)"
                                        placeholder={cType ? "Sélectionner une filière" : "Choisir un type d'abord"}
                                        searchPlaceholder="Rechercher une filière..."
                                        emptyText="Aucune filière trouvée."
                                        createPlaceholder="Nouvelle filière"
                                        disabled={!cType}
                                        options={cFilieres.map((f) => ({ id: f.id, nom: f.nom }))}
                                        selected={cFiliere}
                                        onSelect={(opt) => setCFiliere(opt)}
                                        search={cFiliereSearch}
                                        onSearchChange={setCFiliereSearch}
                                        onCreate={(nom) => handleCreateFiliere(nom, "create")}
                                        isCreating={createFiliereMutation.isPending}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2 min-w-0">
                                        <Label>Section</Label>
                                        <Select value={cSection} onValueChange={setCSection}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={SECTION_NONE}>Aucune</SelectItem>
                                                <SelectItem value="Normal">Normal</SelectItem>
                                                <SelectItem value="Remplacement">Remplacement</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2 min-w-0">
                                        <Label htmlFor="annee">Année *</Label>
                                        <Input id="annee" type="number" placeholder="YYYY" value={cAnnee} onChange={(e) => setCAnnee(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid gap-2 min-w-0">
                                    <Label htmlFor="file">Fichier (PDF)</Label>
                                    <div className="flex gap-2">
                                        <Input id="file" type="file" accept=".pdf" onChange={handleFileChange} className="flex-1" />
                                        {selectedFile && (
                                            <Badge variant="secondary" className="self-center">{selectedFile.name}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isUploading || !cType || (!cMatiere && !cFiliere) || !cAnnee}>
                                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement...</> : "Créer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des examens nationaux</CardTitle>
                    <CardDescription>
                        {items.length} élément{items.length > 1 ? "s" : ""}
                        <div className="grid grid-cols-1 gap-4 mt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher (Titre, Matière, Filière, Type)..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Aucun examen national trouvé.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titre</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Série</TableHead>
                                    <TableHead>Matière</TableHead>
                                    <TableHead>Filière</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead>Année</TableHead>
                                    <TableHead>Date de création</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium max-w-[16rem]">
                                            <span className="block truncate min-w-0">{item.titre}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[10rem]">
                                            <span className="block truncate min-w-0">{item.type_examen?.nom || "—"}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[8rem]">
                                            <span className="block truncate min-w-0">{item.serie?.nom || "—"}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[10rem]">
                                            <span className="block truncate min-w-0">{item.matiere_examen?.nom || "—"}</span>
                                        </TableCell>
                                        <TableCell className="max-w-[10rem]">
                                            <span className="block truncate min-w-0">{item.filiere_examen?.nom || "—"}</span>
                                        </TableCell>
                                        <TableCell>{item.section || "—"}</TableCell>
                                        <TableCell>{item.annee || "—"}</TableCell>
                                        <TableCell>{item.date_creation ? new Date(item.date_creation).toLocaleDateString("fr-FR") : "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleView(item)} title="Voir le fichier">
                                                    <Eye className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        Page {page} sur {totalPages}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Edit dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { setEditingItem(null); setSelectedFile(null); } }}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader><DialogTitle>Modifier l'examen national</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2 min-w-0">
                                <Label>Titre (généré automatiquement)</Label>
                                <Input
                                    readOnly
                                    value={composedEditTitre}
                                    placeholder="Sélectionnez un type, une matière ou une filière, et une année"
                                    className="bg-muted text-muted-foreground"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <CascadeCombobox
                                    label="Type d'examen *"
                                    placeholder="Sélectionner un type"
                                    searchPlaceholder="Rechercher un type..."
                                    emptyText="Aucun type trouvé."
                                    createPlaceholder="Nouveau type"
                                    options={eTypes.map((t) => ({ id: t.id, nom: t.nom }))}
                                    selected={editingItem?.type_examen ? { id: editingItem.type_examen.id, nom: editingItem.type_examen.nom } : null}
                                    onSelect={(opt) => setEditingItem(editingItem ? {
                                        ...editingItem,
                                        type_examen_id: opt.id,
                                        type_examen: { id: opt.id, nom: opt.nom },
                                        serie_id: null, serie: null,
                                        matiere_examen_id: null, matiere_examen: null,
                                        filiere_examen_id: null, filiere_examen: null,
                                    } : null)}
                                    search={eTypeSearch}
                                    onSearchChange={setETypeSearch}
                                    onCreate={(nom) => handleCreateType(nom, "edit")}
                                    isCreating={createTypeMutation.isPending}
                                />
                                <CascadeCombobox
                                    label="Série (optionnel)"
                                    placeholder={editingItem?.type_examen_id ? "Sélectionner une série" : "Choisir un type d'abord"}
                                    searchPlaceholder="Rechercher une série..."
                                    emptyText="Aucune série trouvée."
                                    createPlaceholder="Nouvelle série"
                                    disabled={!editingItem?.type_examen_id}
                                    options={eSeries.map((s) => ({ id: s.id, nom: s.nom }))}
                                    selected={editingItem?.serie ? { id: editingItem.serie.id, nom: editingItem.serie.nom } : null}
                                    onSelect={(opt) => setEditingItem(editingItem ? { ...editingItem, serie_id: opt.id, serie: { id: opt.id, nom: opt.nom, type_examen_id: editingItem.type_examen_id } } : null)}
                                    search={eSerieSearch}
                                    onSearchChange={setESerieSearch}
                                    onCreate={(nom) => handleCreateSerie(nom, "edit")}
                                    isCreating={createSerieMutation.isPending}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground -mb-2">Renseignez au moins une matière <b>ou</b> une filière.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <CascadeCombobox
                                    label="Matière (optionnel)"
                                    placeholder={editingItem?.type_examen_id ? "Sélectionner une matière" : "Choisir un type d'abord"}
                                    searchPlaceholder="Rechercher une matière..."
                                    emptyText="Aucune matière trouvée."
                                    createPlaceholder="Nouvelle matière"
                                    disabled={!editingItem?.type_examen_id}
                                    options={eMatieres.map((m) => ({ id: m.id, nom: m.nom }))}
                                    selected={editingItem?.matiere_examen ? { id: editingItem.matiere_examen.id, nom: editingItem.matiere_examen.nom } : null}
                                    onSelect={(opt) => setEditingItem(editingItem ? { ...editingItem, matiere_examen_id: opt.id, matiere_examen: { id: opt.id, nom: opt.nom, type_examen_id: editingItem.type_examen_id } } : null)}
                                    search={eMatiereSearch}
                                    onSearchChange={setEMatiereSearch}
                                    onCreate={(nom) => handleCreateMatiere(nom, "edit")}
                                    isCreating={createMatiereMutation.isPending}
                                />
                                <CascadeCombobox
                                    label="Filière (optionnel)"
                                    placeholder={editingItem?.type_examen_id ? "Sélectionner une filière" : "Choisir un type d'abord"}
                                    searchPlaceholder="Rechercher une filière..."
                                    emptyText="Aucune filière trouvée."
                                    createPlaceholder="Nouvelle filière"
                                    disabled={!editingItem?.type_examen_id}
                                    options={eFilieres.map((f) => ({ id: f.id, nom: f.nom }))}
                                    selected={editingItem?.filiere_examen ? { id: editingItem.filiere_examen.id, nom: editingItem.filiere_examen.nom } : null}
                                    onSelect={(opt) => setEditingItem(editingItem ? { ...editingItem, filiere_examen_id: opt.id, filiere_examen: { id: opt.id, nom: opt.nom, type_examen_id: editingItem.type_examen_id } } : null)}
                                    search={eFiliereSearch}
                                    onSearchChange={setEFiliereSearch}
                                    onCreate={(nom) => handleCreateFiliere(nom, "edit")}
                                    isCreating={createFiliereMutation.isPending}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2 min-w-0">
                                    <Label>Section</Label>
                                    <Select
                                        value={editingItem?.section || SECTION_NONE}
                                        onValueChange={(v) => setEditingItem(editingItem ? { ...editingItem, section: v === SECTION_NONE ? null : v } : null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={SECTION_NONE}>Aucune</SelectItem>
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="Remplacement">Remplacement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2 min-w-0">
                                    <Label>Année *</Label>
                                    <Input type="number" value={editingItem?.annee || ""} onChange={(e) => setEditingItem(editingItem ? { ...editingItem, annee: parseInt(e.target.value) || (undefined as any) } : null)} />
                                </div>
                            </div>
                            <div className="grid gap-2 min-w-0">
                                <Label>Fichier (Laisser vide pour conserver l'actuel)</Label>
                                <div className="flex gap-2">
                                    <Input type="file" accept=".pdf" onChange={handleFileChange} className="flex-1" />
                                    {selectedFile && (
                                        <Badge variant="secondary" className="self-center">{selectedFile.name}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isUploading || !editingItem?.type_examen_id || (!editingItem?.matiere_examen_id && !editingItem?.filiere_examen_id) || !editingItem?.annee}>
                                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mise à jour...</> : "Mettre à jour"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cet examen national ?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Suppression...</> : "Supprimer"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
