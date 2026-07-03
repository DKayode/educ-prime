import { useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus, Eye } from "lucide-react";
import { filesService } from "@/lib/services/files.service";
import { concoursService, ConcoursSubmission } from "@/lib/services/concours.service";
import { structureService } from "@/lib/services/structure.service";
import { titreService } from "@/lib/services/titre.service";
import { useToast } from "@/hooks/use-toast";

// Inline resolver for a missing (proposed) parent: pick an existing
// structure/titre OR create the proposed one. The resolution is PERSISTED on
// the submission (PATCH /resolve) so the prompt disappears for everyone and the
// same missing entity can't be re-created. Creating reuses an existing row of
// the same name (case-insensitive) instead of minting a duplicate.
function ParentResolver({
    kind,
    submissionId,
    proposedName,
    options,
}: {
    kind: 'structure' | 'titre';
    submissionId: number;
    proposedName?: string | null;
    options: { id: number; nom: string }[];
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const label = kind === 'structure' ? 'structure' : 'titre';
    const field = kind === 'structure' ? 'structure_id' : 'titre_id';

    // Persist the binding onto the submission, then refresh the queue so the row
    // reloads with proposed_* cleared (the resolver is replaced by the name).
    const resolveMutation = useMutation({
        mutationFn: (id: number) => concoursService.resolveSubmission(submissionId, { [field]: id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-submissions"] });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.message || "Échec du rattachement", variant: "destructive" });
        },
    });

    // "+" create: reuse an existing row of the same name if present, else create,
    // then bind the resolved id onto the submission.
    const createMutation = useMutation({
        mutationFn: async (nom: string) => {
            const match = options.find((o) => o.nom.trim().toLowerCase() === nom.trim().toLowerCase());
            if (match) return match;
            const created = kind === 'structure'
                ? await structureService.create({ nom })
                : await titreService.create({ nom });
            return created as { id: number; nom: string };
        },
        onSuccess: async (row: { id: number; nom: string }) => {
            queryClient.invalidateQueries({ queryKey: [kind === 'structure' ? 'structures' : 'titres'] });
            await resolveMutation.mutateAsync(row.id);
            toast({ title: `${label.charAt(0).toUpperCase() + label.slice(1)} rattaché`, description: `« ${row.nom} » rattaché à la soumission.` });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.message || `Échec de la création du ${label}`, variant: "destructive" });
        },
    });

    const busy = createMutation.isPending || resolveMutation.isPending;

    return (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-xs text-amber-600">
                Proposé : « {proposedName || '—'} » — à résoudre
            </span>
            <Select disabled={busy} onValueChange={(v) => resolveMutation.mutate(Number(v))}>
                <SelectTrigger className="h-8">
                    <SelectValue placeholder={`Choisir un ${label} existant`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>{o.nom}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {proposedName && (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 justify-start"
                    onClick={() => createMutation.mutate(proposedName)}
                    disabled={busy}
                >
                    {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                    Créer « {proposedName} »
                </Button>
            )}
        </div>
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
        mutationFn: () => concoursService.declineSubmission(submission.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["concours-submissions"] });
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
        <TableRow>
            <TableCell className="align-top">
                {submission.missing_structure ? (
                    <ParentResolver
                        kind="structure"
                        submissionId={submission.id}
                        proposedName={submission.proposed_structure}
                        options={structures}
                    />
                ) : (
                    <span>{submission.structure?.nom || '—'}</span>
                )}
            </TableCell>
            <TableCell className="align-top">
                {submission.missing_titre ? (
                    <ParentResolver
                        kind="titre"
                        submissionId={submission.id}
                        proposedName={submission.proposed_titre}
                        options={titres}
                    />
                ) : (
                    <span>{submission.titre_ref?.nom || '—'}</span>
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
                        onClick={() => approveMutation.mutate()}
                        title={approveTitle}
                        disabled={pending || !canApprove}
                    >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => declineMutation.mutate()}
                        title="Refuser"
                        disabled={pending}
                    >
                        <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
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
