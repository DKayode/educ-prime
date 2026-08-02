import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus, Eye, Wrench, Check, AlertTriangle } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { filesService } from "@/lib/services/files.service";
import {
    examensNationauxSubmissionsService,
    typesExamenService,
    seriesService,
    matieresFilieresExamenService,
    ExamenNationalSubmission,
} from "@/lib/services/examens-nationaux.service";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS = [
    { value: "pending_approval", label: "En attente" },
    { value: "approved", label: "Approuvées" },
    { value: "declined", label: "Refusées" },
    { value: "all", label: "Tous" },
] as const;

// "Parameter" dialog (mirrors ConcoursResolveDialog): resolve the type /
// série (optionnelle) / matière-filière (pick existing OR create) and edit
// section/année on a pending submission. Série and matière are scoped to the
// resolved type, exactly like the create page. Every classifying change is
// persisted immediately via PATCH /examens-nationaux/submissions/:id.
function ExamenResolveDialog({ submission, types, open, onOpenChange }: {
    submission: ExamenNationalSubmission | null;
    types: { id: number; nom: string }[];
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [section, setSection] = useState('');
    const [annee, setAnnee] = useState('');
    const [newType, setNewType] = useState('');
    const [newSerie, setNewSerie] = useState('');
    const [newMatiere, setNewMatiere] = useState('');

    // Type resolved on the submission scopes the série / matière lookups.
    const currentTypeId = submission?.type_examen_id ?? null;

    const { data: seriesResp } = useQuery({
        queryKey: ['exam-series', currentTypeId],
        queryFn: () => seriesService.getAll({ type_examen: currentTypeId!, limit: 1000 }),
        enabled: open && currentTypeId != null,
    });
    const { data: matieresResp } = useQuery({
        queryKey: ['exam-matieres', currentTypeId],
        queryFn: () => matieresFilieresExamenService.getAll({ type_examen: currentTypeId!, limit: 1000 }),
        enabled: open && currentTypeId != null,
    });
    const series = (seriesResp?.data || []).map(s => ({ id: s.id, nom: s.nom }));
    const matieres = (matieresResp?.data || []).map(m => ({ id: m.id, nom: m.nom }));

    const persist = useMutation({
        mutationFn: (patch: Parameters<typeof examensNationauxSubmissionsService.resolve>[1]) =>
            examensNationauxSubmissionsService.resolve(submission!.id, patch),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['examens-nationaux-submissions'] }),
        onError: (e: any) => toast({ title: 'Erreur', description: e.message || 'Échec', variant: 'destructive' }),
    });

    useEffect(() => {
        if (submission) {
            setSection(submission.section ?? '');
            setAnnee(submission.annee != null ? String(submission.annee) : '');
            setNewType(submission.proposed_type ?? '');
            setNewSerie(submission.proposed_serie ?? '');
            setNewMatiere(submission.proposed_matiere_filiere ?? '');
        }
    }, [submission?.id]);

    if (!submission) return null;

    const bind = async (field: 'type_examen_id' | 'serie_id' | 'matiere_filiere_examen_id', id: number) => {
        await persist.mutateAsync({ [field]: id });
        toast({ title: 'Rattaché', description: 'Entité existante rattachée à la soumission.' });
    };

    const createAndBind = async (kind: 'type' | 'serie' | 'matiere', name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        try {
            let rowId: number;
            let existed = false;
            if (kind === 'type') {
                const existing = types.find(o => o.nom.trim().toLowerCase() === trimmed.toLowerCase());
                if (existing) { rowId = existing.id; existed = true; }
                else { rowId = (await typesExamenService.create({ nom: trimmed })).id; }
                await persist.mutateAsync({ type_examen_id: rowId });
                queryClient.invalidateQueries({ queryKey: ['types-examen'] });
            } else if (kind === 'serie') {
                if (currentTypeId == null) return;
                const existing = series.find(o => o.nom.trim().toLowerCase() === trimmed.toLowerCase());
                if (existing) { rowId = existing.id; existed = true; }
                else { rowId = (await seriesService.create({ nom: trimmed, type_examen_id: currentTypeId })).id; }
                await persist.mutateAsync({ serie_id: rowId });
                queryClient.invalidateQueries({ queryKey: ['exam-series', currentTypeId] });
            } else {
                if (currentTypeId == null) return;
                const existing = matieres.find(o => o.nom.trim().toLowerCase() === trimmed.toLowerCase());
                if (existing) { rowId = existing.id; existed = true; }
                else { rowId = (await matieresFilieresExamenService.create({ nom: trimmed, type_examen_id: currentTypeId })).id; }
                await persist.mutateAsync({ matiere_filiere_examen_id: rowId });
                queryClient.invalidateQueries({ queryKey: ['exam-matieres', currentTypeId] });
            }
            toast({ title: existed ? 'Rattaché' : 'Créé et rattaché', description: existed ? 'Entité existante réutilisée.' : 'Entité créée et rattachée.' });
        } catch (e: any) {
            toast({ title: 'Erreur', description: e.message || 'Échec de la création', variant: 'destructive' });
        }
    };

    const typeResolved = submission.type_examen_id != null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Modifier la soumission</DialogTitle>
                    <DialogDescription>
                        Résolvez le type, la série (optionnelle) et la matière / filière (entité existante ou création),
                        puis ajustez la section et l'année. Chaque changement est enregistré sur la soumission.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Type — required, scopes the two levels below */}
                    <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold">Type d'examen</Label>
                            {submission.type_examen_id != null ? (
                                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Résolu</Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {newType ? `à créer: ${newType}` : 'manquant'}
                                </Badge>
                            )}
                        </div>
                        <div className="space-y-2">
                            <SearchableSelect
                                value={submission.type_examen_id}
                                options={types}
                                onSelect={(id) => bind('type_examen_id', id)}
                                placeholder="Choisir un type d'examen existant…"
                                searchPlaceholder="Rechercher un type…"
                                emptyText="Aucun type disponible — créez-en un ci-dessous"
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Nom du type d'examen…"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    className="shrink-0 gap-1"
                                    disabled={!newType.trim() || persist.isPending}
                                    onClick={() => createAndBind('type', newType)}
                                >
                                    <Plus className="h-4 w-4" /> Créer
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Série — optional, scoped to the resolved type */}
                    <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold">Série <span className="text-muted-foreground font-normal">(optionnelle)</span></Label>
                            {submission.serie_id != null ? (
                                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Résolue</Badge>
                            ) : newSerie ? (
                                <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" /> à créer: {newSerie}
                                </Badge>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            <SearchableSelect
                                value={submission.serie_id}
                                options={series}
                                onSelect={(id) => bind('serie_id', id)}
                                disabled={!typeResolved}
                                placeholder={typeResolved ? "Choisir une série existante…" : "Résolvez d'abord le type"}
                                searchPlaceholder="Rechercher une série…"
                                emptyText="Aucune série — créez-en une ci-dessous"
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Nom de la série…"
                                    value={newSerie}
                                    disabled={!typeResolved}
                                    onChange={(e) => setNewSerie(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    className="shrink-0 gap-1"
                                    disabled={!typeResolved || !newSerie.trim() || persist.isPending}
                                    onClick={() => createAndBind('serie', newSerie)}
                                >
                                    <Plus className="h-4 w-4" /> Créer
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Matière / Filière — required, scoped to the resolved type */}
                    <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold">Matière / Filière</Label>
                            {submission.matiere_filiere_examen_id != null ? (
                                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Résolue</Badge>
                            ) : (
                                <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {newMatiere ? `à créer: ${newMatiere}` : 'manquant'}
                                </Badge>
                            )}
                        </div>
                        <div className="space-y-2">
                            <SearchableSelect
                                value={submission.matiere_filiere_examen_id}
                                options={matieres}
                                onSelect={(id) => bind('matiere_filiere_examen_id', id)}
                                disabled={!typeResolved}
                                placeholder={typeResolved ? "Choisir une matière / filière existante…" : "Résolvez d'abord le type"}
                                searchPlaceholder="Rechercher une matière / filière…"
                                emptyText="Aucune matière / filière — créez-en une ci-dessous"
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Nom de la matière / filière…"
                                    value={newMatiere}
                                    disabled={!typeResolved}
                                    onChange={(e) => setNewMatiere(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    className="shrink-0 gap-1"
                                    disabled={!typeResolved || !newMatiere.trim() || persist.isPending}
                                    onClick={() => createAndBind('matiere', newMatiere)}
                                >
                                    <Plus className="h-4 w-4" /> Créer
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border p-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Section</Label>
                            <Select value={section || undefined} onValueChange={setSection}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="Remplacement">Remplacement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Année</Label>
                            <Input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="Année" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={persist.isPending}>Fermer</Button>
                    <Button
                        onClick={async () => {
                            await persist.mutateAsync({
                                section: section || undefined,
                                annee: annee.trim() ? parseInt(annee) : undefined,
                            });
                            toast({ title: 'Enregistré', description: 'Modifications enregistrées.' });
                        }}
                        disabled={persist.isPending}
                    >
                        {persist.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Enregistrer les modifications
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SubmissionRow({
    submission,
    types,
}: {
    submission: ExamenNationalSubmission;
    types: { id: number; nom: string }[];
}) {
    const [resolveOpen, setResolveOpen] = useState(false);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Resolution is persisted on the submission (PATCH /resolve), so the bound
    // ids / missing flags live on the row itself — no local state to drift.
    const anyMissing = submission.missing_type || submission.missing_matiere || submission.missing_serie;

    const approveMutation = useMutation({
        mutationFn: () => examensNationauxSubmissionsService.approve(submission.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["examens-nationaux-submissions"] });
            toast({ title: "Soumission approuvée", description: "L'examen national a été créé et l'auteur notifié." });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.message || "Échec de l'approbation", variant: "destructive" });
        },
    });

    const declineMutation = useMutation({
        mutationFn: (reason?: string) => examensNationauxSubmissionsService.decline(submission.id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["examens-nationaux-submissions"] });
            setDeclineOpen(false);
            setDeclineReason("");
            toast({ title: "Soumission refusée", description: "L'auteur en sera informé." });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.message || "Échec du refus", variant: "destructive" });
        },
    });

    const submitterName = () => {
        const u = submission.soumis_par;
        if (!u) return '-';
        const name = [u.prenom, u.nom].filter(Boolean).join(' ').trim();
        return name || u.email || '-';
    };

    // A file is mandatory to approve (the submission exists to collect the PDF).
    const hasFile = !!(submission.file_path || submission.url);
    const pending = approveMutation.isPending || declineMutation.isPending;

    // Open the submitted PDF in a new tab using the Cloudflare R2 presigned URL
    // (private slot). Open the tab in the click handler so the popup isn't blocked.
    const viewFile = async () => {
        const win = window.open("", "_blank");
        try {
            const res = await filesService.getDownloadUrl("examens_nationaux_submissions", submission.uuid, "file");
            if (res?.url) { if (win) win.location.href = res.url; else window.open(res.url, "_blank", "noopener"); }
            else { win?.close(); toast({ title: "Fichier indisponible", description: "Impossible de générer le lien R2 du fichier.", variant: "destructive" }); }
        } catch (e: any) {
            win?.close();
            toast({ title: "Erreur", description: e?.message || "Impossible d'ouvrir le fichier depuis R2.", variant: "destructive" });
        }
    };

    // Type + matière required (série is optional) AND a file must be present.
    const canApprove = !submission.missing_type && !submission.missing_matiere && hasFile;
    const isPendingStatus = submission.status === 'pending_approval';
    const approveTitle = !hasFile
        ? "En attente du fichier"
        : (!submission.missing_type && !submission.missing_matiere ? "Approuver" : "Résolvez le type et la matière d'abord");

    return (
        <>
        <TableRow>
            <TableCell className="align-top">
                {submission.missing_type ? (
                    <Badge variant="destructive" className="font-normal gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {submission.proposed_type ? `à créer: ${submission.proposed_type}` : 'Type manquant'}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">{submission.type_examen?.nom || '—'}</Badge>
                )}
            </TableCell>
            <TableCell className="align-top">
                {submission.serie_id != null ? (
                    <Badge variant="outline" className="font-normal">{submission.serie?.nom || '—'}</Badge>
                ) : submission.proposed_serie ? (
                    <Badge variant="destructive" className="font-normal gap-1">
                        <AlertTriangle className="h-3 w-3" /> à créer: {submission.proposed_serie}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell className="align-top">
                {submission.missing_matiere ? (
                    <Badge variant="destructive" className="font-normal gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {submission.proposed_matiere_filiere ? `à créer: ${submission.proposed_matiere_filiere}` : 'Matière manquante'}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">{submission.matiere_filiere_examen?.nom || '—'}</Badge>
                )}
            </TableCell>
            <TableCell className="align-top">{submission.section || '—'}</TableCell>
            <TableCell className="align-top">{submission.annee ?? '—'}</TableCell>
            <TableCell className="align-top">{submitterName()}</TableCell>
            <TableCell className="align-top">
                {submission.status === 'approved' ? (
                    <Badge variant="default">Approuvée</Badge>
                ) : submission.status === 'declined' ? (
                    <Badge variant="destructive" title={submission.decline_reason || undefined}>Refusée</Badge>
                ) : (
                    <Badge variant="outline">En attente</Badge>
                )}
            </TableCell>
            <TableCell className="align-top text-right">
                <div className="flex items-center justify-end gap-2">
                    {!hasFile && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">Fichier manquant</Badge>
                    )}
                    {hasFile && (
                        <Button variant="ghost" size="icon" onClick={viewFile} title="Voir le fichier soumis">
                            <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                    )}
                    {isPendingStatus && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setResolveOpen(true)}
                                title={anyMissing ? "Résoudre le type / la série / la matière" : "Modifier la soumission"}
                                disabled={pending}
                            >
                                <Wrench className={`h-4 w-4 ${anyMissing ? 'text-orange-500' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => approveMutation.mutate()}
                                title={approveTitle}
                                disabled={pending || !canApprove}
                            >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeclineOpen(true)}
                                title="Refuser"
                                disabled={pending}
                            >
                                <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                        </>
                    )}
                </div>
            </TableCell>
        </TableRow>
        <ExamenResolveDialog
            submission={resolveOpen ? submission : null}
            types={types}
            open={resolveOpen}
            onOpenChange={setResolveOpen}
        />
        <Dialog open={declineOpen} onOpenChange={(o) => { setDeclineOpen(o); if (!o) setDeclineReason(""); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Refuser la soumission</DialogTitle>
                    <DialogDescription>L'auteur sera notifié par email. Vous pouvez préciser un motif (optionnel).</DialogDescription>
                </DialogHeader>
                <Textarea
                    placeholder="Motif du refus (optionnel)…"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                />
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setDeclineOpen(false); setDeclineReason(""); }}>Annuler</Button>
                    <Button
                        variant="destructive"
                        onClick={() => declineMutation.mutate(declineReason.trim() || undefined)}
                        disabled={declineMutation.isPending}
                    >
                        {declineMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Refuser
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

export default function ExamensNationauxApprobation() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [status, setStatus] = useState<string>('pending_approval');

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['examens-nationaux-submissions', status, page, limit],
        queryFn: () => examensNationauxSubmissionsService.list({ status, page, limit }),
    });

    // Options for resolving the type (fetched once, generous page size). Série
    // and matière options are fetched inside the dialog, scoped to the type.
    const { data: typesResp } = useQuery({
        queryKey: ['types-examen'],
        queryFn: () => typesExamenService.getAll({ limit: 1000 }),
    });

    const submissions = response?.data || [];
    const totalPages = response?.totalPages || 1;
    const types = (typesResp?.data || []).map(t => ({ id: t.id, nom: t.nom }));

    const handleLimitChange = (val: string) => {
        setLimit(parseInt(val));
        setPage(1);
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Examens nationaux en attente</h1>
                    <p className="text-muted-foreground">
                        Soumissions des utilisateurs. Résolvez le type / la série / la matière manquant(e), puis approuvez ou refusez.
                    </p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Soumissions d'examens nationaux</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Statut:</span>
                                <Select value={status} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Items par page:</span>
                                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">
                            Erreur lors du chargement des soumissions
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Série</TableHead>
                                        <TableHead>Matière / Filière</TableHead>
                                        <TableHead>Section</TableHead>
                                        <TableHead>Année</TableHead>
                                        <TableHead>Auteur</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                                                Aucune soumission.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        submissions.map((s) => (
                                            <SubmissionRow
                                                key={s.id}
                                                submission={s}
                                                types={types}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
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
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
