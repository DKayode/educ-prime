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
import { Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { concoursService, ConcoursSubmission } from "@/lib/services/concours.service";
import { structureService } from "@/lib/services/structure.service";
import { titreService } from "@/lib/services/titre.service";
import { useToast } from "@/hooks/use-toast";

// Inline resolver for a missing (proposed) parent: pick an existing
// structure/titre OR create the proposed one. Reports the resolved id upward.
function ParentResolver({
    kind,
    proposedName,
    options,
    value,
    onResolved,
}: {
    kind: 'structure' | 'titre';
    proposedName?: string | null;
    options: { id: number; nom: string }[];
    value?: number;
    onResolved: (id: number) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const label = kind === 'structure' ? 'structure' : 'titre';

    const createMutation = useMutation({
        mutationFn: (nom: string) =>
            kind === 'structure' ? structureService.create({ nom }) : titreService.create({ nom }),
        onSuccess: (created: { id: number; nom: string }) => {
            queryClient.invalidateQueries({ queryKey: [kind === 'structure' ? 'structures' : 'titres'] });
            onResolved(created.id);
            toast({ title: `${label.charAt(0).toUpperCase() + label.slice(1)} créé`, description: `« ${created.nom} » ajouté et rattaché.` });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.message || `Échec de la création du ${label}`, variant: "destructive" });
        },
    });

    return (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-xs text-amber-600">
                Proposé : « {proposedName || '—'} » — à résoudre
            </span>
            <Select value={value ? String(value) : undefined} onValueChange={(v) => onResolved(Number(v))}>
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
                    disabled={createMutation.isPending}
                >
                    {createMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
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

    // Effective resolved ids: the submission's own id, or one chosen/created here.
    const [structureId, setStructureId] = useState<number | undefined>(submission.structure_id ?? undefined);
    const [titreId, setTitreId] = useState<number | undefined>(submission.titre_id ?? undefined);

    const bothResolved = structureId != null && titreId != null;

    const approveMutation = useMutation({
        mutationFn: () => concoursService.approveSubmission(submission.id, { structure_id: structureId, titre_id: titreId }),
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

    const pending = approveMutation.isPending || declineMutation.isPending;

    return (
        <TableRow>
            <TableCell className="align-top">
                {submission.missing_structure ? (
                    <ParentResolver
                        kind="structure"
                        proposedName={submission.proposed_structure}
                        options={structures}
                        value={structureId}
                        onResolved={setStructureId}
                    />
                ) : (
                    <span>{submission.structure?.nom || '—'}</span>
                )}
            </TableCell>
            <TableCell className="align-top">
                {submission.missing_titre ? (
                    <ParentResolver
                        kind="titre"
                        proposedName={submission.proposed_titre}
                        options={titres}
                        value={titreId}
                        onResolved={setTitreId}
                    />
                ) : (
                    <span>{submission.titre_ref?.nom || '—'}</span>
                )}
            </TableCell>
            <TableCell className="align-top">{submission.annee ?? '—'}</TableCell>
            <TableCell className="align-top">{submission.lieu || '—'}</TableCell>
            <TableCell className="align-top">{submitterName()}</TableCell>
            <TableCell className="align-top text-right">
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => approveMutation.mutate()}
                        title={bothResolved ? "Approuver" : "Résolvez la structure et le titre d'abord"}
                        disabled={pending || !bothResolved}
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
