import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { CheckCircle2, XCircle, Loader2, FileText, ScanText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { filesService } from "@/lib/services/files.service";
import { PdfPane } from "@/components/ketsia/PdfPane";
import { TranscriptionPane, type PageTranscrite } from "@/components/ketsia/TranscriptionPane";
import {
    kessiahService,
    type Transcription,
    type TranscriptionStatut,
    type TranscriptionTarget,
} from "@/lib/services/kessiah.service";

/**
 * Relecture d'une transcription, document et texte côte à côte.
 *
 * Relire une transcription sans voir le document revient à la croire sur
 * parole — ce que la relecture est précisément censée éviter. Les deux volets
 * sont donc appariés PAR NUMÉRO DE PAGE : faire défiler l'un amène l'autre sur
 * la même page. L'alignement au pixel serait un mensonge, une page dense et
 * une page presque vide n'ayant pas la même hauteur de texte.
 *
 * Une fois le verdict rendu, les boutons disparaissent : la fenêtre devient un
 * état des lieux, pas une invitation à trancher deux fois.
 */

interface Props {
    /** Épreuve publiée, ou soumission encore en attente d'approbation. */
    target: TranscriptionTarget | null;
    titre?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Prévient l'écran appelant qu'un verdict vient d'être rendu. */
    onDecision?: () => void;
}

const STATUT_LABEL: Record<TranscriptionStatut, string> = {
    en_cours: "Lecture en cours",
    extrait: "Lue, en attente de relecture",
    valide: "Relue et validée",
    rejete: "Rejetée",
};

const STATUT_VARIANT: Record<TranscriptionStatut, "default" | "secondary" | "destructive" | "outline"> = {
    en_cours: "outline",
    extrait: "secondary",
    valide: "default",
    rejete: "destructive",
};

export function TranscriptionReviewDialog({ target, titre, open, onOpenChange, onDecision }: Props) {
    const { toast } = useToast();
    const [transcription, setTranscription] = useState<Transcription | null>(null);
    const [pages, setPages] = useState<PageTranscrite[]>([]);
    const [texteEntier, setTexteEntier] = useState("");
    const [pageActive, setPageActive] = useState(1);
    const [urlPdf, setUrlPdf] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const enAttenteDApprobation = target?.kind === "submission";

    useEffect(() => {
        if (!open || target == null) return;
        let annule = false;

        setLoading(true);
        setTranscription(null);
        setPages([]);
        setUrlPdf(null);
        setPageActive(1);

        let urlObjet: string | null = null;
        const afficher = (blob: Blob | null) => {
            if (annule || !blob) return;
            urlObjet = URL.createObjectURL(blob);
            setUrlPdf(urlObjet);
        };

        kessiahService
            .getTranscription(target)
            .then((data) => {
                if (annule) return;
                setTranscription(data);
                setPages(data?.pages ?? []);
                setTexteEntier(data?.texte ?? "");
                // Une épreuve publiée n'est identifiée ici que par son numéro,
                // alors que le stockage est indexé par UUID : seul le corps de
                // la transcription le porte. Le chargement du document part
                // donc d'ici, et non en parallèle.
                if (target.kind === "epreuve" && data?.epreuve_uuid) {
                    filesService
                        .getContentBlob("epreuves", data.epreuve_uuid, "file")
                        .then(afficher)
                        .catch(() => undefined);
                }
            })
            .catch((err: any) => {
                if (annule) return;
                toast({
                    title: "Transcription indisponible",
                    description: err?.message ?? "Ketsia n'a pas répondu.",
                    variant: "destructive",
                });
            })
            .finally(() => !annule && setLoading(false));

        // Le document est récupéré en OCTETS via notre API, puis exposé au
        // lecteur sous forme d'URL objet.
        //
        // Une URL présignée R2 ne convient pas ici : elle suffit à ouvrir le
        // document dans un onglet — une navigation ignore le CORS — mais pas à
        // l'afficher dans la page, où react-pdf télécharge en `fetch`. Le
        // bucket ne renvoyant pas d'en-tête CORS pour cette origine, le
        // navigateur bloquait, et l'échec remontait en « Failed to fetch ».
        //
        // Son absence n'empêche pas de relire le texte : on dégrade vers le
        // volet unique plutôt que de bloquer toute la fenêtre.
        // Une soumission, elle, porte son UUID : son document peut partir tout
        // de suite, sans attendre la transcription.
        if (target.kind === "submission") {
            filesService
                .getContentBlob("epreuve_submissions", target.uuid, "file")
                .then(afficher)
                .catch(() => undefined);
        }

        return () => {
            annule = true;
            // Sans révocation, chaque ouverture de la fenêtre retiendrait le
            // PDF entier en mémoire jusqu'au rechargement de la page.
            if (urlObjet) URL.revokeObjectURL(urlObjet);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, target?.kind, (target as any)?.id, (target as any)?.uuid, toast]);

    const majPage = useCallback((numero: number, texte: string) => {
        setPages((actuelles) =>
            actuelles.map((p) => (p.numero === numero ? { ...p, texte } : p)),
        );
    }, []);

    // Le texte envoyé au serveur : la concaténation des pages quand il y a une
    // découpe, le champ unique sinon.
    const texteSoumis = useMemo(
        () => (pages.length ? pages.map((p) => p.texte).join("\n\n") : texteEntier),
        [pages, texteEntier],
    );

    const enCours = transcription?.statut === "en_cours";
    const dejaTranche =
        transcription?.statut === "valide" || transcription?.statut === "rejete";
    const confiance = transcription?.confidence;

    const submit = async (statut: "valide" | "rejete") => {
        if (target == null) return;
        setSaving(true);
        try {
            // On ne renvoie le texte que s'il a réellement changé : une
            // correction remet la confiance à 1 et recalcule le découpage en
            // exercices, ce qu'un simple clic de validation ne doit pas faire.
            const modifie = transcription != null && texteSoumis !== transcription.texte;
            await kessiahService.review(target, {
                statut,
                ...(modifie && statut === "valide" ? { texte: texteSoumis } : {}),
            });
            toast({
                title: statut === "valide" ? "Transcription validée" : "Transcription rejetée",
                description:
                    statut === "valide"
                        ? enAttenteDApprobation
                            ? "Ketsia pourra s'appuyer dessus pour corriger, dès l'approbation de l'épreuve."
                            : "Ketsia peut désormais s'appuyer dessus pour corriger."
                        : "Ketsia traitera l'épreuve comme un scan illisible : ni correction, ni citation du texte.",
            });
            onDecision?.();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: "Enregistrement impossible",
                description: err?.message ?? "Ketsia n'a pas répondu.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const cotesACotes = Boolean(urlPdf) && !loading && transcription != null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[92vh] max-w-[95vw] flex-col gap-3 p-4 sm:max-w-[95vw]">
                <DialogHeader className="space-y-1.5">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <ScanText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Transcription — {titre ?? "épreuve"}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {enAttenteDApprobation
                            ? "L'épreuve n'étant pas encore publiée, personne ne peut interroger Ketsia dessus : votre verdict décide de ce qu'elle s'autorisera une fois l'épreuve en ligne."
                            : "Tant que la transcription n'est pas validée, Ketsia peut résumer et expliquer, mais s'interdit d'affirmer une correction."}
                    </DialogDescription>
                </DialogHeader>

                {!loading && transcription && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={STATUT_VARIANT[transcription.statut]}>
                            {STATUT_LABEL[transcription.statut]}
                        </Badge>
                        <Badge variant="outline" className="gap-1 font-normal">
                            {transcription.source === "ocr" ? (
                                <><ScanText className="h-3 w-3" /> Scan transcrit</>
                            ) : (
                                <><FileText className="h-3 w-3" /> Texte du PDF</>
                            )}
                        </Badge>
                        {transcription.exercices.length > 0 && (
                            <Badge variant="outline" className="font-normal">
                                {transcription.exercices.length} exercice
                                {transcription.exercices.length > 1 ? "s" : ""}
                            </Badge>
                        )}
                        {confiance != null && (
                            <Badge
                                variant={confiance < 0.6 ? "destructive" : "outline"}
                                className="font-normal tabular-nums"
                            >
                                Fiabilité {Math.round(confiance * 100)} %
                            </Badge>
                        )}
                        {transcription.tronque && (
                            <Badge variant="destructive" className="font-normal">Document tronqué</Badge>
                        )}
                        {enCours && (
                            <Badge variant="outline" className="gap-1 font-normal">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {transcription.pages_pretes}/{transcription.pages_total ?? "?"} pages
                            </Badge>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!loading && !transcription && (
                    <div className="flex flex-1 items-center justify-center px-8 text-center">
                        <p className="max-w-md text-sm text-muted-foreground">
                            Ketsia n'a pas encore rendu de transcription
                            {enAttenteDApprobation &&
                                " — la lecture démarre à l'ouverture de la file, sans attendre l'approbation"}
                            . Comptez quelques secondes pour un PDF qui porte déjà son texte, quelques
                            minutes pour un scan, qu'il faut transcrire page par page. Rouvrez cette
                            fenêtre dans un instant.
                        </p>
                    </div>
                )}

                {!loading && transcription && (
                    <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
                        {cotesACotes ? (
                            <PanelGroup direction="horizontal">
                                <Panel defaultSize={50} minSize={25}>
                                    <PdfPane
                                        url={urlPdf!}
                                        pageActive={pageActive}
                                        onPageVisible={setPageActive}
                                        onPagesChargees={() => undefined}
                                    />
                                </Panel>
                                <PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/40 data-[resize-handle-active]:bg-primary" />
                                <Panel defaultSize={50} minSize={25}>
                                    <TranscriptionPane
                                        pages={pages}
                                        texteEntier={texteEntier}
                                        pageActive={pageActive}
                                        onPageVisible={setPageActive}
                                        onTexteChange={majPage}
                                        onTexteEntierChange={setTexteEntier}
                                        lectureSeule={dejaTranche || saving}
                                    />
                                </Panel>
                            </PanelGroup>
                        ) : (
                            <TranscriptionPane
                                pages={pages}
                                texteEntier={texteEntier}
                                pageActive={pageActive}
                                onPageVisible={setPageActive}
                                onTexteChange={majPage}
                                onTexteEntierChange={setTexteEntier}
                                lectureSeule={dejaTranche || saving}
                            />
                        )}
                    </div>
                )}

                {!loading && transcription?.source === "ocr" && !enCours && !dejaTranche && (
                    <p className="text-xs text-muted-foreground">
                        Transcription automatique : comparez-la au document avant de valider. Les
                        passages marqués <code className="rounded bg-muted px-1">[illisible]</code>{" "}
                        n'ont pas pu être lus — ne les complétez que si vous les déchiffrez vous-même.
                    </p>
                )}

                <DialogFooter className="gap-2 sm:justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                        {dejaTranche && (
                            <span className="flex items-center gap-1.5">
                                {transcription?.statut === "valide" ? (
                                    <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Verdict déjà rendu — plus rien à décider ici.</>
                                ) : (
                                    <><XCircle className="h-3.5 w-3.5 text-destructive" /> Transcription rejetée — Ketsia n'exploitera pas ce texte.</>
                                )}
                            </span>
                        )}
                        {enCours && (
                            <span className="flex items-center gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Lecture en cours : attendez la fin avant de vous prononcer.
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Fermer
                        </Button>
                        {/* Masqués une fois le verdict rendu : la fenêtre devient
                            un état des lieux, pas une invitation à trancher deux fois. */}
                        {!dejaTranche && transcription && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => submit("rejete")}
                                    disabled={saving}
                                >
                                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                    Rejeter
                                </Button>
                                <Button
                                    onClick={() => submit("valide")}
                                    disabled={saving || enCours || !texteSoumis.trim()}
                                >
                                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                                    Valider
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
