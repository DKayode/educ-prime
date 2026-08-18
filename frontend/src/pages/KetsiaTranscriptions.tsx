import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Bar,
    BarChart,
    CartesianGrid,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    ScanText,
    FileText,
    CheckCircle2,
    XCircle,
    Eye,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Sparkles,
    RefreshCw,
} from "lucide-react";
import { TranscriptionReviewDialog } from "@/components/TranscriptionReviewDialog";
import { useToast } from "@/hooks/use-toast";
import {
    kessiahService,
    ketsiaInventaireService,
    type ExtractionRow,
    type TranscriptionStatut,
    type TranscriptionTarget,
} from "@/lib/services/kessiah.service";

/**
 * Inventaire des lectures faites par Ketsia.
 *
 * Ce que l'administration doit pouvoir constater d'un coup d'œil : combien
 * d'épreuves l'assistante sait lire, combien lui restent opaques, et
 * lesquelles attendent encore un verdict humain. Sans cet écran, l'état de la
 * transcription n'était visible qu'épreuve par épreuve, depuis la file de
 * modération — donc jamais consulté d'ensemble.
 *
 * Une nuance porte tout le tableau : « en cours » n'est ni lisible ni
 * illisible. Ranger une lecture inachevée d'un côté ou de l'autre serait un
 * jugement prématuré, et ferait osciller les compteurs à chaque dépôt.
 */

const STATUT_LABEL: Record<TranscriptionStatut, string> = {
    en_cours: "Lecture en cours",
    extrait: "À relire",
    valide: "Validée",
    rejete: "Rejetée",
};

const STATUT_VARIANT: Record<TranscriptionStatut, "default" | "secondary" | "destructive" | "outline"> = {
    en_cours: "outline",
    extrait: "secondary",
    valide: "default",
    rejete: "destructive",
};

// Teintes empruntées aux jetons du thème plutôt qu'au hasard, pour que le
// graphique reste lisible en clair comme en sombre.
const COULEURS = {
    lisible: "hsl(142 71% 45%)",
    illisible: "hsl(0 72% 51%)",
    encours: "hsl(38 92% 50%)",
    valide: "hsl(221 83% 53%)",
    arelire: "hsl(258 90% 66%)",
};

function Tuile({
    titre,
    valeur,
    detail,
    icone,
    accent,
}: {
    titre: string;
    valeur: number | string;
    detail?: string;
    icone: React.ReactNode;
    accent?: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{titre}</CardTitle>
                <span style={accent ? { color: accent } : undefined}>{icone}</span>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{valeur}</div>
                {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
            </CardContent>
        </Card>
    );
}

/**
 * Les deux gestes possibles sur une ligne — relire, relancer — et leur mise en
 * sommeil pendant que Ketsia lit.
 *
 * Une lecture en cours n'a rien à montrer : le texte s'écrit page par page et
 * aucun verdict n'est rendu. La relancer serait pire que vain — `relire` efface
 * la ligne et repart de zéro, donc jetterait le travail en train de se faire,
 * et sur un scan le referait payer à la page.
 *
 * Les deux boutons sont donc inertes, et l'icône de relance tourne. C'est ce
 * qui distingue d'un coup d'œil, dans un tableau où toutes les lignes se
 * ressemblent, ce que Ketsia est EN TRAIN de lire de ce qu'elle a fini de lire.
 * La même rotation couvre le court instant entre le clic sur « relancer » et
 * la réapparition de la ligne en `en_cours` : l'admin ne voit pas l'icône
 * s'arrêter puis repartir.
 */
function ActionsLecture({
    row,
    relanceDemandee,
    onOuvrir,
    onRelancer,
}: {
    row: ExtractionRow;
    relanceDemandee: boolean;
    onOuvrir: () => void;
    onRelancer: () => void;
}) {
    const enLecture = row.statut === "en_cours";
    const relanceSuspendue = enLecture || relanceDemandee;

    return (
        <div className="flex justify-end gap-1">
            {/* Le `title` est porté par un span : les navigateurs n'affichent
                pas l'infobulle d'un bouton désactivé, qui ne reçoit plus
                d'évènement de survol. Or c'est précisément là qu'il faut
                expliquer pourquoi le geste est indisponible. */}
            <span
                title={
                    enLecture
                        ? "Lecture en cours — il n'y a pas encore de texte à relire"
                        : "Relire la transcription"
                }
            >
                <Button variant="ghost" size="icon" onClick={onOuvrir} disabled={enLecture}>
                    <Eye className="h-4 w-4" />
                </Button>
            </span>
            <span
                title={
                    enLecture
                        ? "Lecture en cours — la relance redeviendra possible une fois terminée"
                        : relanceDemandee
                            ? "Relance demandée…"
                            : "Relancer la lecture — efface la lecture actuelle et son verdict"
                }
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRelancer}
                    disabled={relanceSuspendue}
                >
                    <RefreshCw className={`h-4 w-4 ${relanceSuspendue ? "animate-spin" : ""}`} />
                </Button>
            </span>
        </div>
    );
}

export default function KetsiaTranscriptions() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statut, setStatut] = useState<string>("ALL");
    const [lisibilite, setLisibilite] = useState<string>("ALL");
    const [source, setSource] = useState<string>("ALL");
    const [recherche, setRecherche] = useState("");
    const [page, setPage] = useState(1);
    const [cible, setCible] = useState<TranscriptionTarget | null>(null);
    const [dialogOuvert, setDialogOuvert] = useState(false);
    const [relectureEnCours, setRelectureEnCours] = useState<string | null>(null);

    const stats = useQuery({
        queryKey: ["ketsia-stats"],
        queryFn: () => ketsiaInventaireService.stats(),
        // La transcription tourne en arrière-plan : sans rafraîchissement, les
        // compteurs resteraient figés pendant qu'elle avance.
        refetchInterval: 15_000,
    });

    const liste = useQuery({
        queryKey: ["ketsia-extractions", statut, lisibilite, source, recherche, page],
        queryFn: () =>
            ketsiaInventaireService.liste({
                statut: statut === "ALL" ? undefined : statut,
                lisible: lisibilite === "ALL" ? undefined : lisibilite === "oui",
                source: source === "ALL" ? undefined : source,
                recherche: recherche.trim() || undefined,
                page,
                limit: 20,
            }),
        refetchInterval: 15_000,
    });

    const s = stats.data;

    const repartition = s
        ? [
            { nom: "Lisibles", valeur: s.lisibles, couleur: COULEURS.lisible },
            { nom: "Illisibles", valeur: s.illisibles, couleur: COULEURS.illisible },
            { nom: "En cours", valeur: s.en_cours, couleur: COULEURS.encours },
        ].filter((d) => d.valeur > 0)
        : [];

    const parStatut = s
        ? [
            { nom: "Lecture en cours", valeur: s.par_statut.en_cours ?? 0, couleur: COULEURS.encours },
            { nom: "À relire", valeur: s.par_statut.extrait ?? 0, couleur: COULEURS.arelire },
            { nom: "Validées", valeur: s.par_statut.valide ?? 0, couleur: COULEURS.valide },
            { nom: "Rejetées", valeur: s.par_statut.rejete ?? 0, couleur: COULEURS.illisible },
        ]
        : [];

    const aRelire = s?.par_statut.extrait ?? 0;

    /**
     * Relance la lecture d'une épreuve depuis zéro.
     *
     * Demande confirmation : le verdict précédent est effacé avec le texte, et
     * une relecture sur un scan consomme des appels de modèle facturés à la
     * page.
     */
    const demanderRelecture = async (row: ExtractionRow) => {
        const dejaTranche = row.statut === "valide" || row.statut === "rejete";
        const avertissement = dejaTranche
            ? "\n\nLe verdict actuel sera perdu : le texte relu ne sera plus celui qui a été tranché."
            : "";
        if (
            !window.confirm(
                `Relancer la lecture de « ${row.epreuve_id} » ?\n\n` +
                `La lecture actuelle est effacée et le document est relu depuis le début.` +
                `${row.source === "ocr" ? " S'agissant d'un scan, cela consomme des appels de transcription." : ""}` +
                avertissement,
            )
        ) {
            return;
        }

        setRelectureEnCours(row.epreuve_id);
        try {
            await kessiahService.relire(row.epreuve_id);
            toast({
                title: "Lecture relancée",
                description:
                    "Quelques secondes pour un PDF qui porte son texte, quelques minutes pour un scan. " +
                    "L'état se met à jour tout seul.",
            });
            // La lecture repart de zéro : la ligne et les compteurs changent.
            queryClient.invalidateQueries({ queryKey: ["ketsia-extractions"] });
            queryClient.invalidateQueries({ queryKey: ["ketsia-stats"] });
        } catch (err: any) {
            toast({
                title: "Relecture impossible",
                description: err?.message ?? "Ketsia n'a pas répondu.",
                variant: "destructive",
            });
        } finally {
            setRelectureEnCours(null);
        }
    };

    const ouvrir = (row: ExtractionRow) => {
        // Une transcription faite au dépôt vit sous la clé `submission:<uuid>` ;
        // une fois l'épreuve publiée, sous son identifiant numérique.
        setCible(
            row.epreuve_id.startsWith("submission:")
                ? { kind: "submission", uuid: row.epreuve_id.slice("submission:".length) }
                : { kind: "epreuve", id: row.epreuve_id },
        );
        setDialogOuvert(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Lectures de Ketsia
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Ce que l'assistante sait lire des épreuves — et ce qui lui reste opaque.
                    </p>
                </div>
                {aRelire > 0 && (
                    <Badge variant="secondary" className="gap-1.5 py-1.5 text-sm">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {aRelire} transcription{aRelire > 1 ? "s" : ""} à relire
                    </Badge>
                )}
            </div>

            {stats.isLoading && (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {stats.isError && (
                <Card className="border-destructive/40">
                    <CardContent className="py-6 text-sm text-muted-foreground">
                        Ketsia n'a pas répondu. L'intégration est-elle configurée
                        (<code>KESSIAH_API_BASE_URL</code>, <code>KESSIAH_SERVICE_KEY</code>) ?
                    </CardContent>
                </Card>
            )}

            {s && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Tuile
                            titre="Épreuves lues"
                            valeur={s.total}
                            detail={`${s.pages_transcrites} page${s.pages_transcrites > 1 ? "s" : ""} transcrite${s.pages_transcrites > 1 ? "s" : ""}`}
                            icone={<FileText className="h-4 w-4" />}
                        />
                        <Tuile
                            titre="Exploitables"
                            valeur={s.lisibles}
                            detail={s.total ? `${Math.round((s.lisibles / s.total) * 100)} % du corpus` : undefined}
                            icone={<CheckCircle2 className="h-4 w-4" />}
                            accent={COULEURS.lisible}
                        />
                        <Tuile
                            titre="Illisibles"
                            valeur={s.illisibles}
                            detail={s.tronques ? `dont ${s.tronques} tronquée${s.tronques > 1 ? "s" : ""}` : "Ketsia n'en tire rien"}
                            icone={<XCircle className="h-4 w-4" />}
                            accent={COULEURS.illisible}
                        />
                        <Tuile
                            titre="En cours"
                            valeur={s.en_cours}
                            detail={
                                s.confiance_moyenne != null
                                    ? `Fiabilité moyenne ${Math.round(s.confiance_moyenne * 100)} %`
                                    : "Transcription en arrière-plan"
                            }
                            icone={<Loader2 className={`h-4 w-4 ${s.en_cours ? "animate-spin" : ""}`} />}
                            accent={COULEURS.encours}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Exploitabilité du corpus</CardTitle>
                                <CardDescription className="text-xs">
                                    Une lecture en cours n'est comptée ni comme lisible ni comme
                                    illisible : le verdict n'est pas encore rendu.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[240px]">
                                {repartition.length === 0 ? (
                                    <p className="pt-16 text-center text-sm text-muted-foreground">
                                        Aucune épreuve lue pour l'instant.
                                    </p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={repartition}
                                                dataKey="valeur"
                                                nameKey="nom"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={2}
                                            >
                                                {repartition.map((d) => (
                                                    <Cell key={d.nom} fill={d.couleur} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    background: "hsl(var(--popover))",
                                                    border: "1px solid hsl(var(--border))",
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                iconType="circle"
                                                formatter={(v) => <span className="text-xs">{v}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Avancement de la relecture</CardTitle>
                                <CardDescription className="text-xs">
                                    Tant qu'une transcription n'est pas relue, Ketsia s'interdit
                                    d'affirmer une correction sur cette épreuve.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={parStatut} margin={{ top: 8, right: 8, bottom: 8, left: -18 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis
                                            dataKey="nom"
                                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={0}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "hsl(var(--muted))" }}
                                            contentStyle={{
                                                background: "hsl(var(--popover))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: 6,
                                                fontSize: 12,
                                            }}
                                        />
                                        <Bar dataKey="valeur" radius={[4, 4, 0, 0]}>
                                            {parStatut.map((d) => (
                                                <Cell key={d.nom} fill={d.couleur} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Détail par épreuve</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Input
                            placeholder="Rechercher un identifiant…"
                            value={recherche}
                            onChange={(e) => {
                                setRecherche(e.target.value);
                                setPage(1);
                            }}
                            className="max-w-[240px]"
                        />
                        <Select value={statut} onValueChange={(v) => { setStatut(v); setPage(1); }}>
                            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les statuts</SelectItem>
                                <SelectItem value="en_cours">Lecture en cours</SelectItem>
                                <SelectItem value="extrait">À relire</SelectItem>
                                <SelectItem value="valide">Validées</SelectItem>
                                <SelectItem value="rejete">Rejetées</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={lisibilite} onValueChange={(v) => { setLisibilite(v); setPage(1); }}>
                            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Lisibles et non</SelectItem>
                                <SelectItem value="oui">Exploitables</SelectItem>
                                <SelectItem value="non">Illisibles</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
                            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes provenances</SelectItem>
                                <SelectItem value="text_layer">Texte du PDF</SelectItem>
                                <SelectItem value="ocr">Scan transcrit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {liste.isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : !liste.data?.data.length ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            Aucune lecture ne correspond à ces filtres.
                        </p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Épreuve</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Provenance</TableHead>
                                            <TableHead className="text-right">Pages</TableHead>
                                            <TableHead className="text-right">Fiabilité</TableHead>
                                            <TableHead className="text-right">Exercices</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {liste.data.data.map((row) => (
                                            <TableRow key={row.epreuve_id}>
                                                <TableCell className="font-mono text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        {row.lisible ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: COULEURS.lisible }} />
                                                        ) : row.statut === "en_cours" ? (
                                                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" style={{ color: COULEURS.encours }} />
                                                        ) : (
                                                            <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: COULEURS.illisible }} />
                                                        )}
                                                        <span className="truncate">{row.epreuve_id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={STATUT_VARIANT[row.statut]} className="font-normal">
                                                        {STATUT_LABEL[row.statut]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        {row.source === "ocr" ? (
                                                            <><ScanText className="h-3.5 w-3.5" /> Scan</>
                                                        ) : (
                                                            <><FileText className="h-3.5 w-3.5" /> PDF</>
                                                        )}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-xs tabular-nums">
                                                    {row.pages_pretes}
                                                    {row.pages_total ? ` / ${row.pages_total}` : ""}
                                                    {row.tronque && (
                                                        <Badge variant="destructive" className="ml-1.5 text-[10px] font-normal">
                                                            tronqué
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-xs tabular-nums">
                                                    {row.confidence == null ? (
                                                        <span className="text-muted-foreground">—</span>
                                                    ) : (
                                                        <span className={row.confidence < 0.6 ? "text-destructive" : ""}>
                                                            {Math.round(row.confidence * 100)} %
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-xs tabular-nums">
                                                    {row.exercices || <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ActionsLecture
                                                        row={row}
                                                        relanceDemandee={relectureEnCours === row.epreuve_id}
                                                        onOuvrir={() => ouvrir(row)}
                                                        onRelancer={() => demanderRelecture(row)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    {liste.data.total} lecture{liste.data.total > 1 ? "s" : ""} — page{" "}
                                    {liste.data.page} / {Math.max(1, liste.data.totalPages)}
                                </p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" disabled={page <= 1}
                                        onClick={() => setPage((p) => p - 1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon"
                                        disabled={page >= (liste.data.totalPages || 1)}
                                        onClick={() => setPage((p) => p + 1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <TranscriptionReviewDialog
                target={cible}
                open={dialogOuvert}
                onOpenChange={setDialogOuvert}
                onDecision={() => {
                    stats.refetch();
                    liste.refetch();
                }}
            />
        </div>
    );
}
