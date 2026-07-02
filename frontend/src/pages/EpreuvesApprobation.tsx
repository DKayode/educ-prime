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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight, Wrench, AlertTriangle, Check, FileWarning } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { epreuveSubmissionsService, EpreuveSubmission, ResolveSubmissionData } from "@/lib/services/epreuve-submissions.service";
import { etablissementsService } from "@/lib/services/etablissements.service";
import { filieresService } from "@/lib/services/filieres.service";
import { niveauxService } from "@/lib/services/niveaux.service";
import { matieresService } from "@/lib/services/matieres.service";

const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
        case 'active':
        case 'approved': return 'default';
        case 'pending_approval': return 'secondary';
        case 'declined': return 'destructive';
        default: return 'secondary';
    }
};

const getStatusLabel = (status?: string) => {
    switch (status) {
        case 'approved': return 'Approuvée';
        case 'pending_approval': return 'En Attente';
        case 'declined': return 'Refusée';
        default: return status || '-';
    }
};

// One badge per parent level: the resolved name, or the proposed name flagged "à créer".
function ChainCell({ submission }: { submission: EpreuveSubmission }) {
    const levels: { resolved?: { nom: string } | null; proposed?: string | null; label: string }[] = [
        { resolved: submission.etablissement, proposed: submission.proposed_etablissement, label: 'Étab.' },
        { resolved: submission.filiere, proposed: submission.proposed_filiere, label: 'Filière' },
        { resolved: submission.niveau_etude, proposed: submission.proposed_niveau, label: 'Niveau' },
        { resolved: submission.matiere, proposed: submission.proposed_matiere, label: 'Matière' },
    ];
    return (
        <div className="flex flex-wrap gap-1">
            {levels.map((lvl, i) => lvl.resolved ? (
                <Badge key={i} variant="outline" className="font-normal">{lvl.resolved.nom}</Badge>
            ) : (
                <Badge key={i} variant="destructive" className="font-normal gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {lvl.proposed ? `à créer: ${lvl.proposed}` : `${lvl.label} manquant`}
                </Badge>
            ))}
        </div>
    );
}

// Per-level resolution: pick an existing entity OR create a new one (using the
// already-resolved parent id), then PATCH the submission with the chosen ids.
function ResolveDialog({ submission, open, onOpenChange }: {
    submission: EpreuveSubmission | null;
    open: boolean;
    onOpenChange: (o: boolean) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [chosen, setChosen] = useState<ResolveSubmissionData>({});
    const [newNames, setNewNames] = useState<Record<string, string>>({});

    const lists = {
        etablissement: useQuery({ queryKey: ['etabs-all'], queryFn: () => etablissementsService.getAll({ limit: 200 }), enabled: open }),
        filiere: useQuery({ queryKey: ['filieres-all'], queryFn: () => filieresService.getAll({ limit: 200 }), enabled: open }),
        niveau_etude: useQuery({ queryKey: ['niveaux-all'], queryFn: () => niveauxService.getAll({ limit: 200 }), enabled: open }),
        matiere: useQuery({ queryKey: ['matieres-all'], queryFn: () => matieresService.getAll({ limit: 200 }), enabled: open }),
    };

    const reset = () => { setChosen({}); setNewNames({}); };

    // Hooks must run before any early return — keep useMutation above the
    // `!submission` guard (this no-op-when-closed dialog toggles submission).
    const resolveMutation = useMutation({
        mutationFn: () => epreuveSubmissionsService.resolve(submission!.id, chosen),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
            toast({ title: "Parents mis à jour", description: "La soumission a été résolue." });
            reset();
            onOpenChange(false);
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message || "Échec de la résolution", variant: "destructive" }),
    });

    if (!submission) return null;

    // Effective ids = locally chosen, falling back to what's already on the submission.
    const eff = {
        etablissement_id: chosen.etablissement_id ?? submission.etablissement?.id,
        filiere_id: chosen.filiere_id ?? submission.filiere?.id,
        niveau_etude_id: chosen.niveau_etude_id ?? submission.niveau_etude?.id,
        matiere_id: chosen.matiere_id ?? submission.matiere?.id,
    };
    const allResolved = !!(eff.etablissement_id && eff.filiere_id && eff.niveau_etude_id && eff.matiere_id);

    const createAndChoose = async (
        level: keyof ResolveSubmissionData,
        name: string,
        options: { id: number; nom: string }[],
        creator: () => Promise<{ id: number }>,
    ) => {
        try {
            // Reuse an existing entity of the same name (case-insensitive) instead
            // of minting a duplicate; only create when truly new.
            const trimmed = name.trim();
            const existing = options.find(o => o.nom.trim().toLowerCase() === trimmed.toLowerCase());
            const row = existing ?? await creator();
            setChosen(c => ({ ...c, [level]: row.id }));
            toast({
                title: existing ? "Rattaché" : "Créé",
                description: existing ? "Entité existante réutilisée." : "Entité créée et sélectionnée.",
            });
        } catch (e: any) {
            toast({ title: "Erreur", description: e.message || "Échec de la création", variant: "destructive" });
        }
    };

    type LevelCfg = {
        key: keyof ResolveSubmissionData;
        label: string;
        resolvedName?: string;
        proposed?: string | null;
        options: { id: number; nom: string }[];
        canCreate: boolean;
        create: (nom: string) => Promise<{ id: number }>;
    };

    const levels: LevelCfg[] = [
        {
            key: 'etablissement_id', label: 'Établissement',
            resolvedName: submission.etablissement?.nom, proposed: submission.proposed_etablissement,
            options: lists.etablissement.data?.data ?? [],
            canCreate: true,
            create: (nom) => etablissementsService.create({ nom }),
        },
        {
            key: 'filiere_id', label: 'Filière',
            resolvedName: submission.filiere?.nom, proposed: submission.proposed_filiere,
            options: lists.filiere.data?.data ?? [],
            canCreate: !!eff.etablissement_id,
            create: (nom) => filieresService.create({ nom, etablissement_id: eff.etablissement_id! }),
        },
        {
            key: 'niveau_etude_id', label: "Niveau d'étude",
            resolvedName: submission.niveau_etude?.nom, proposed: submission.proposed_niveau,
            options: lists.niveau_etude.data?.data ?? [],
            canCreate: !!eff.filiere_id,
            create: (nom) => niveauxService.create({ nom, filiere_id: eff.filiere_id! }),
        },
        {
            key: 'matiere_id', label: 'Matière',
            resolvedName: submission.matiere?.nom, proposed: submission.proposed_matiere,
            options: lists.matiere.data?.data ?? [],
            canCreate: !!eff.niveau_etude_id,
            create: (nom) => matieresService.create({
                nom,
                niveau_etude_id: eff.niveau_etude_id!,
                filiere_id: eff.filiere_id!,
            }),
        },
    ];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Résoudre les parents — {submission.titre}</DialogTitle>
                    <DialogDescription>
                        Pour chaque niveau manquant, sélectionnez une entité existante ou créez-la.
                        L'approbation sera possible une fois les quatre niveaux résolus.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {levels.map((lvl) => {
                        const effId = chosen[lvl.key] ?? (lvl.resolvedName ? -1 : undefined);
                        const isResolved = lvl.key === 'etablissement_id' ? !!eff.etablissement_id
                            : lvl.key === 'filiere_id' ? !!eff.filiere_id
                                : lvl.key === 'niveau_etude_id' ? !!eff.niveau_etude_id
                                    : !!eff.matiere_id;
                        const alreadyOnSubmission = !!lvl.resolvedName;

                        return (
                            <div key={lvl.key} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="font-semibold">{lvl.label}</Label>
                                    {isResolved ? (
                                        <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Résolu</Badge>
                                    ) : (
                                        <Badge variant="destructive" className="gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {lvl.proposed ? `à créer: ${lvl.proposed}` : 'manquant'}
                                        </Badge>
                                    )}
                                </div>

                                {alreadyOnSubmission ? (
                                    <p className="text-sm text-muted-foreground">{lvl.resolvedName}</p>
                                ) : (
                                    <div className="space-y-2">
                                        <Select
                                            value={chosen[lvl.key] ? String(chosen[lvl.key]) : undefined}
                                            onValueChange={(v) => setChosen(c => ({ ...c, [lvl.key]: parseInt(v) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choisir une entité existante…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {lvl.options.map((o) => (
                                                    <SelectItem key={o.id} value={String(o.id)}>{o.nom}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder={lvl.proposed ? `Créer "${lvl.proposed}"…` : `Nom de la ${lvl.label.toLowerCase()}…`}
                                                value={newNames[lvl.key] ?? lvl.proposed ?? ''}
                                                onChange={(e) => setNewNames(n => ({ ...n, [lvl.key]: e.target.value }))}
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                disabled={!lvl.canCreate || !(newNames[lvl.key] ?? lvl.proposed ?? '').trim()}
                                                title={lvl.canCreate ? 'Créer cette entité' : 'Résolvez d\'abord le niveau parent'}
                                                onClick={() => {
                                                    const name = (newNames[lvl.key] ?? lvl.proposed ?? '').trim();
                                                    createAndChoose(lvl.key, name, lvl.options, () => lvl.create(name));
                                                }}
                                            >
                                                Créer
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Annuler</Button>
                    <Button
                        onClick={() => resolveMutation.mutate()}
                        disabled={resolveMutation.isPending || Object.keys(chosen).length === 0}
                    >
                        {resolveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Enregistrer la résolution
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function EpreuvesApprobation() {
    const [selectedStatus, setSelectedStatus] = useState<string>("pending_approval");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [resolveTarget, setResolveTarget] = useState<EpreuveSubmission | null>(null);
    const [declineTarget, setDeclineTarget] = useState<EpreuveSubmission | null>(null);
    const [declineReason, setDeclineReason] = useState("");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['admin-submissions', selectedStatus, page, limit],
        queryFn: () => epreuveSubmissionsService.list({
            status: selectedStatus === "ALL" ? undefined : selectedStatus,
            page,
            limit,
        }),
    });

    const submissions = response?.data || [];
    const totalPages = response?.totalPages || 1;

    const approveMutation = useMutation({
        mutationFn: (id: number) => epreuveSubmissionsService.approve(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
            queryClient.invalidateQueries({ queryKey: ['epreuves'] });
            toast({ title: "Soumission approuvée", description: "L'épreuve a été créée. L'auteur a été notifié par email." });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message || "Échec de l'approbation", variant: "destructive" }),
    });

    const declineMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) => epreuveSubmissionsService.decline(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
            setDeclineTarget(null);
            setDeclineReason("");
            toast({ title: "Soumission refusée", description: "L'auteur a été notifié par email." });
        },
        onError: (e: any) => toast({ title: "Erreur", description: e.message || "Échec du refus", variant: "destructive" }),
    });

    const handleLimitChange = (val: string) => { setLimit(parseInt(val)); setPage(1); };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Épreuves en attente</h1>
                <p className="text-muted-foreground">Résolvez les parents manquants, puis approuvez ou refusez les épreuves soumises</p>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Soumissions</CardTitle>
                    <CardDescription>
                        <div className="flex flex-col md:flex-row gap-4 mt-4 items-center">
                            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(1); }}>
                                <SelectTrigger className="w-full md:w-[250px]">
                                    <SelectValue placeholder="Filtrer par statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending_approval">En Attente</SelectItem>
                                    <SelectItem value="approved">Approuvées</SelectItem>
                                    <SelectItem value="declined">Refusées</SelectItem>
                                    <SelectItem value="ALL">Tous les statuts</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Items par page:</span>
                                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
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
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">Erreur lors du chargement des soumissions</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Titre</TableHead>
                                        <TableHead>Chaîne (Étab. › Filière › Niveau › Matière)</TableHead>
                                        <TableHead>Année</TableHead>
                                        <TableHead>Section</TableHead>
                                        <TableHead>Auteur</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">Aucune soumission trouvée.</TableCell>
                                        </TableRow>
                                    ) : submissions.map((sub) => {
                                        const hasMissing = sub.missing.etablissement || sub.missing.filiere || sub.missing.niveau_etude || sub.missing.matiere;
                                        const hasFile = !!(sub.file_path || sub.url);
                                        const isPending = sub.status === 'pending_approval';
                                        const approveTitle = hasMissing
                                            ? "Résolvez d'abord tous les parents"
                                            : !hasFile ? "En attente du fichier" : "Approuver";
                                        return (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-medium max-w-[180px] truncate" title={sub.titre}>{sub.titre}</TableCell>
                                                <TableCell><ChainCell submission={sub} /></TableCell>
                                                <TableCell>{sub.annee || '-'}</TableCell>
                                                <TableCell className="capitalize">{sub.section || '-'}</TableCell>
                                                <TableCell>{sub.soumis_par ? `${sub.soumis_par.prenom} ${sub.soumis_par.nom}` : '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <Badge variant={getStatusBadgeVariant(sub.status)}>{getStatusLabel(sub.status)}</Badge>
                                                        {isPending && !hasFile && (
                                                            <Badge variant="destructive" className="font-normal gap-1">
                                                                <FileWarning className="h-3 w-3" />
                                                                Fichier manquant
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isPending && (
                                                            <>
                                                                {hasMissing && (
                                                                    <Button variant="ghost" size="icon" onClick={() => setResolveTarget(sub)} title="Résoudre les parents manquants">
                                                                        <Wrench className="h-4 w-4 text-orange-500" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    onClick={() => approveMutation.mutate(sub.id)}
                                                                    title={approveTitle}
                                                                    disabled={hasMissing || !hasFile || approveMutation.isPending}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost" size="icon"
                                                                    onClick={() => setDeclineTarget(sub)}
                                                                    title="Refuser"
                                                                    disabled={declineMutation.isPending}
                                                                >
                                                                    <XCircle className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center space-x-2 py-4">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-sm text-muted-foreground">Page {page} sur {totalPages}</div>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <ResolveDialog
                submission={resolveTarget}
                open={!!resolveTarget}
                onOpenChange={(o) => !o && setResolveTarget(null)}
            />

            <Dialog open={!!declineTarget} onOpenChange={(o) => { if (!o) { setDeclineTarget(null); setDeclineReason(""); } }}>
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
                        <Button variant="outline" onClick={() => { setDeclineTarget(null); setDeclineReason(""); }}>Annuler</Button>
                        <Button
                            variant="destructive"
                            onClick={() => declineTarget && declineMutation.mutate({ id: declineTarget.id, reason: declineReason.trim() || undefined })}
                            disabled={declineMutation.isPending}
                        >
                            {declineMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Refuser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
