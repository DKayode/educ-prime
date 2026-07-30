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
import { filesService } from "@/lib/services/files.service";
import { concoursService, ConcoursSubmission } from "@/lib/services/concours.service";
import { structureService } from "@/lib/services/structure.service";
import { titreService } from "@/lib/services/titre.service";
import { useToast } from "@/hooks/use-toast";

// "Parameter" dialog (mirrors the épreuves ResolveDialog): resolve the
// structure/titre (pick existing OR create) and edit année/lieu on a pending
// submission. Every change is persisted via PATCH /concours/submissions/:id.
function ConcoursResolveDialog({ submission, structures, titres, open, onOpenChange }: {
    submission: ConcoursSubmission | null;
    structures: { id: number; nom: string }[];
    titres: { id: number; nom: string }[];
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [annee, setAnnee] = useState('');
    const [lieu, setLieu] = useState('');
    const [newStructure, setNewStructure] = useState('');
    const [newTitre, setNewTitre] = useState('');

    const persist = useMutation({
        mutationFn: (patch: Parameters<typeof concoursService.resolveSubmission>[1]) =>
            concoursService.resolveSubmission(submission!.id, patch),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['concours-submissions'] }),
        onError: (e: any) => toast({ title: 'Erreur', description: e.message || 'Échec', variant: 'destructive' }),
    });

    useEffect(() => {
        if (submission) {
            setAnnee(submission.annee != null ? String(submission.annee) : '');
            setLieu(submission.lieu ?? '');
            setNewStructure(submission.proposed_structure ?? '');
            setNewTitre(submission.proposed_titre ?? '');
        }
    }, [submission?.id]);

    if (!submission) return null;

    const bind = async (field: 'structure_id' | 'titre_id', id: number) => {
        await persist.mutateAsync({ [field]: id });
        toast({ title: 'Rattaché', description: 'Entité existante rattachée à la soumission.' });
    };

    const createAndBind = async (kind: 'structure' | 'titre', name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        try {
            const options = kind === 'structure' ? structures : titres;
            const existing = options.find(o => o.nom.trim().toLowerCase() === trimmed.toLowerCase());
            const row = existing ?? (kind === 'structure'
                ? await structureService.create({ nom: trimmed })
                : await titreService.create({ nom: trimmed }));
            await persist.mutateAsync({ [kind === 'structure' ? 'structure_id' : 'titre_id']: row.id });
            queryClient.invalidateQueries({ queryKey: [kind === 'structure' ? 'structures' : 'titres'] });
            toast({ title: existing ? 'Rattaché' : 'Créé et rattaché', description: existing ? 'Entité existante réutilisée.' : 'Entité créée et rattachée.' });
        } catch (e: any) {
            toast({ title: 'Erreur', description: e.message || 'Échec de la création', variant: 'destructive' });
        }
    };

    const levels = [
        { kind: 'structure' as const, label: 'Structure', field: 'structure_id' as const, resolvedName: submission.structure?.nom, resolvedId: submission.structure_id, options: structures, newVal: newStructure, setNew: setNewStructure },
        { kind: 'titre' as const, label: 'Titre', field: 'titre_id' as const, resolvedName: submission.titre_ref?.nom, resolvedId: submission.titre_id, options: titres, newVal: newTitre, setNew: setNewTitre },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Modifier la soumission</DialogTitle>
                    <DialogDescription>
                        Résolvez la structure et le titre (entité existante ou création) et ajustez l'année et le lieu.
                        Chaque changement est enregistré sur la soumission.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {levels.map((lvl) => (
                        <div key={lvl.kind} className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">{lvl.label}</Label>
                                {lvl.resolvedId != null ? (
                                    <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Résolu</Badge>
                                ) : (
                                    <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {lvl.newVal ? `à créer: ${lvl.newVal}` : 'manquant'}
                                    </Badge>
                                )}
                            </div>
                            {lvl.resolvedId != null ? (
                                <p className="text-sm text-muted-foreground">{lvl.resolvedName}</p>
                            ) : (
                                <div className="space-y-2">
                                    <Select onValueChange={(v) => bind(lvl.field, parseInt(v))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={`Choisir un(e) ${lvl.label.toLowerCase()} existant(e)…`} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lvl.options.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.nom}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder={`Nom de la ${lvl.label.toLowerCase()}…`}
                                            value={lvl.newVal}
                                            onChange={(e) => lvl.setNew(e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            className="shrink-0 gap-1"
                                            disabled={!lvl.newVal.trim() || persist.isPending}
                                            onClick={() => createAndBind(lvl.kind, lvl.newVal)}
                                        >
                                            <Plus className="h-4 w-4" /> Créer
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="rounded-lg border p-3 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>Année</Label>
                            <Input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="Année" />
                        </div>
                        <div className="space-y-1">
                            <Label>Lieu</Label>
                            <Input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Lieu" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={persist.isPending}>Fermer</Button>
                    <Button
                        onClick={async () => {
                            await persist.mutateAsync({ annee: annee.trim() ? parseInt(annee) : undefined, lieu });
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
    structures,
    titres,
}: {
    submission: ConcoursSubmission;
    structures: { id: number; nom: string }[];
    titres: { id: number; nom: string }[];
}) {
    const [resolveOpen, setResolveOpen] = useState(false);
    const [declineOpen, setDeclineOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Resolution is persisted on the submission (PATCH /resolve), so the bound
    // ids live on the row itself — no local state to drift out of sync.
    const bothResolved = submission.structure_id != null && submission.titre_id != null;

    const approveMutation = useMutation({
        mutationFn: () => concoursService.approveSubmission(submission.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-submissions"] });
            toast({ title: "Soumission approuvée", description: "Le concours a été créé et l'auteur notifié." });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.message || "Échec de l'approbation", variant: "destructive" });
        },
    });

    const declineMutation = useMutation({
        mutationFn: (reason?: string) => concoursService.declineSubmission(submission.id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-submissions"] });
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
    // ONLY (private slot) — never the legacy Firebase link. Open the tab in the
    // click handler so the browser doesn't block the popup.
    const viewFile = async () => {
        const win = window.open("", "_blank");
        try {
            const res = await filesService.getDownloadUrl("concours_submissions", submission.uuid, "file");
            if (res?.url) { if (win) win.location.href = res.url; else window.open(res.url, "_blank", "noopener"); }
            else { win?.close(); toast({ title: "Fichier indisponible", description: "Impossible de générer le lien R2 du fichier.", variant: "destructive" }); }
        } catch (e: any) {
            win?.close();
            toast({ title: "Erreur", description: e?.message || "Impossible d'ouvrir le fichier depuis R2.", variant: "destructive" });
        }
    };
    const canApprove = bothResolved && hasFile;
    const approveTitle = !hasFile
        ? "En attente du fichier"
        : (bothResolved ? "Approuver" : "Résolvez la structure et le titre d'abord");

    return (
        <>
        <TableRow>
            <TableCell className="align-top">
                {submission.missing_structure ? (
                    <Badge variant="destructive" className="font-normal gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {submission.proposed_structure ? `à créer: ${submission.proposed_structure}` : 'Structure manquante'}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">{submission.structure?.nom || '—'}</Badge>
                )}
            </TableCell>
            <TableCell className="align-top">
                {submission.missing_titre ? (
                    <Badge variant="destructive" className="font-normal gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {submission.proposed_titre ? `à créer: ${submission.proposed_titre}` : 'Titre manquant'}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">{submission.titre_ref?.nom || '—'}</Badge>
                )}
            </TableCell>
            <TableCell className="align-top">{submission.annee ?? '—'}</TableCell>
            <TableCell className="align-top">{submission.lieu || '—'}</TableCell>
            <TableCell className="align-top">{submitterName()}</TableCell>
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
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResolveOpen(true)}
                        title="Modifier / résoudre la soumission"
                        disabled={pending}
                    >
                        <Wrench className="h-4 w-4 text-orange-500" />
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
                </div>
            </TableCell>
        </TableRow>
        <ConcoursResolveDialog
            submission={resolveOpen ? submission : null}
            structures={structures}
            titres={titres}
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

export default function ConcoursAdmin() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['concours-submissions', page, limit],
        queryFn: () => concoursService.getSubmissions({ status: 'pending_approval', page, limit }),
    });

    // Options for resolving missing parents (fetched once, generous page size).
    const { data: structuresResp } = useQuery({
        queryKey: ['structures'],
        queryFn: () => structureService.getAll({ limit: 1000 }),
    });
    const { data: titresResp } = useQuery({
        queryKey: ['titres'],
        queryFn: () => titreService.getAll({ limit: 1000 }),
    });

    const submissions = response?.data || [];
    const totalPages = response?.totalPages || 1;
    const structures = (structuresResp?.data || []).map(s => ({ id: s.id, nom: s.nom }));
    const titres = (titresResp?.data || []).map(t => ({ id: t.id, nom: t.nom }));

    const handleLimitChange = (val: string) => {
        setLimit(parseInt(val));
        setPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Concours en attente</h1>
                    <p className="text-muted-foreground">
                        Soumissions des utilisateurs. Résolvez la structure / le titre manquant, puis approuvez ou refusez.
                    </p>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Soumissions en attente d'approbation</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
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
                                        <TableHead>Structure</TableHead>
                                        <TableHead>Titre / Poste</TableHead>
                                        <TableHead>Année</TableHead>
                                        <TableHead>Lieu</TableHead>
                                        <TableHead>Soumis par</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Aucune soumission en attente.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        submissions.map((s) => (
                                            <SubmissionRow
                                                key={s.id}
                                                submission={s}
                                                structures={structures}
                                                titres={titres}
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
