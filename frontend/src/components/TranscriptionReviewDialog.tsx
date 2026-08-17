import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    kessiahService,
    type Transcription,
    type TranscriptionStatut,
    type TranscriptionTarget,
} from "@/lib/services/kessiah.service";

/**
 * Relecture de la transcription d'une épreuve par l'administration.
 *
 * Kessiah lit chaque épreuve validée : directement dans le PDF quand il porte
 * une couche texte, par transcription d'un modèle vision quand c'est un scan.
 * La seconde n'est jamais sûre — d'où cette relecture, qui décide de ce que
 * l'assistante s'autorisera : tant qu'un humain n'a pas validé, elle peut
 * résumer et expliquer, mais jamais affirmer une correction.
 *
 * Le texte est modifiable : réparer une coquille prend quelques secondes quand
 * on a le document sous les yeux, et vaut mieux qu'un rejet en bloc qui
 * priverait l'épreuve de toute exploitation.
 */

interface Props {
    /** Épreuve publiée, ou soumission encore en attente d'approbation. */
    target: TranscriptionTarget | null;
    titre?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const STATUT_LABEL: Record<TranscriptionStatut, string> = {
    en_cours: "Lecture en cours",
    extrait: "Lue, non relue",
    valide: "Relue et validée",
    rejete: "Rejetée",
};

const STATUT_VARIANT: Record<TranscriptionStatut, "default" | "secondary" | "destructive" | "outline"> = {
    en_cours: "outline",
    extrait: "secondary",
    valide: "default",
    rejete: "destructive",
};

export function TranscriptionReviewDialog({ target, titre, open, onOpenChange }: Props) {
    const { toast } = useToast();
    const [transcription, setTranscription] = useState<Transcription | null>(null);
    const [texte, setTexte] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || target == null) return;
        let cancelled = false;

        setLoading(true);
        setTranscription(null);
        kessiahService
            .getTranscription(target)
            .then((data) => {
                if (cancelled) return;
                setTranscription(data);
                setTexte(data?.texte ?? "");
            })
            .catch((err: any) => {
                if (cancelled) return;
                toast({
                    title: "Transcription indisponible",
                    description: err?.message ?? "Kessiah n'a pas répondu.",
                    variant: "destructive",
                });
            })
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, target?.kind, (target as any)?.id, (target as any)?.uuid, toast]);

    const submit = async (statut: "valide" | "rejete") => {
        if (target == null) return;
        setSaving(true);
        try {
            // On ne renvoie le texte que s'il a réellement changé : une
            // correction remet la confiance à 1 et recalcule le découpage en
            // exercices, ce qu'un simple clic de validation ne doit pas faire.
            const modifie = transcription != null && texte !== transcription.texte;
            await kessiahService.review(target, {
                statut,
                ...(modifie && statut === "valide" ? { texte } : {}),
            });
            toast({
                title: statut === "valide" ? "Transcription validée" : "Transcription rejetée",
                description:
                    statut === "valide"
                        ? "Kessiah peut désormais s'appuyer dessus pour corriger."
                        : "L'épreuve redevient un scan illisible pour Kessiah.",
            });
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: "Enregistrement impossible",
                description: err?.message ?? "Kessiah n'a pas répondu.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const enCours = transcription?.statut === "en_cours";
    const confiance = transcription?.confidence;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Transcription — {titre ?? "épreuve"}</DialogTitle>
                    <DialogDescription>
                        Ce que Kessiah lit de cette épreuve. Tant qu'elle n'est pas validée, l'assistante
                        peut résumer et expliquer, mais s'interdit d'affirmer une correction.
                    </DialogDescription>
                </DialogHeader>

                {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

                {!loading && !transcription && (
                    <p className="text-sm text-muted-foreground">
                        Kessiah n'a pas encore lu cette épreuve. La lecture est déclenchée à sa validation,
                        et se termine en quelques secondes pour un PDF, en quelques minutes pour un scan.
                    </p>
                )}

                {!loading && transcription && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={STATUT_VARIANT[transcription.statut]}>
                                {STATUT_LABEL[transcription.statut]}
                            </Badge>
                            <Badge variant="outline">
                                {transcription.source === "ocr" ? "Scan transcrit" : "Texte du PDF"}
                            </Badge>
                            {transcription.exercices.length > 0 && (
                                <Badge variant="outline">
                                    {transcription.exercices.length} exercice
                                    {transcription.exercices.length > 1 ? "s" : ""}
                                </Badge>
                            )}
                            {confiance != null && (
                                <Badge variant={confiance < 0.6 ? "destructive" : "outline"}>
                                    Fiabilité {Math.round(confiance * 100)} %
                                </Badge>
                            )}
                            {transcription.tronque && (
                                <Badge variant="destructive">Document tronqué</Badge>
                            )}
                        </div>

                        {enCours && (
                            <p className="text-sm text-muted-foreground">
                                Lecture en cours : {transcription.pages_pretes} page
                                {transcription.pages_pretes > 1 ? "s" : ""} sur{" "}
                                {transcription.pages_total ?? "?"}. Le texte ci-dessous n'est encore que le
                                début du document — attendez la fin avant de valider.
                            </p>
                        )}

                        {transcription.source === "ocr" && !enCours && (
                            <p className="text-sm text-muted-foreground">
                                Transcription automatique d'un scan : comparez-la au document avant de
                                valider. Les passages marqués <code>[illisible]</code> n'ont pas pu être
                                lus — ne les complétez que si vous les déchiffrez vous-même.
                            </p>
                        )}

                        <Textarea
                            value={texte}
                            onChange={(e) => setTexte(e.target.value)}
                            rows={16}
                            className="font-mono text-xs"
                            placeholder="Aucun texte n'a pu être extrait de ce document."
                        />
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Fermer
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => submit("rejete")}
                        disabled={saving || !transcription}
                    >
                        Rejeter
                    </Button>
                    <Button
                        onClick={() => submit("valide")}
                        disabled={saving || !transcription || enCours || !texte.trim()}
                    >
                        Valider
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
