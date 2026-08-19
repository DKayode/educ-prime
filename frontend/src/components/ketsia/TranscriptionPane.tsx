import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

/**
 * La transcription, découpée par page et alignée sur le document d'en face.
 *
 * L'appariement se fait par NUMÉRO DE PAGE, pas par position de défilement.
 * Deux textes de longueurs différentes — une page dense en face d'une page
 * presque vide — ne peuvent pas être synchronisés au pixel sans mentir. La
 * page, elle, est une correspondance exacte : Kessiah stocke une ligne par
 * page transcrite, on affiche donc la page N en face de la page N.
 *
 * Le texte reste modifiable : corriger une coquille prend quelques secondes
 * quand on a le document sous les yeux, et vaut mieux qu'un rejet en bloc qui
 * priverait l'épreuve de toute exploitation.
 */

export interface PageTranscrite {
    numero: number;
    texte: string;
    confidence: number | null;
}

interface Props {
    pages: PageTranscrite[];
    /** Repli quand la transcription vient d'une couche texte, non découpée. */
    texteEntier: string;
    pageActive: number;
    onPageVisible: (page: number) => void;
    onTexteChange: (pageNumero: number, texte: string) => void;
    /** Repli éditable, utilisé quand il n'y a pas de découpe par page. */
    onTexteEntierChange: (texte: string) => void;
    lectureSeule: boolean;
    marqueurIllisible?: string;
}

const MARQUEUR = "[illisible]";

export function TranscriptionPane({
    pages,
    texteEntier,
    pageActive,
    onPageVisible,
    onTexteChange,
    onTexteEntierChange,
    lectureSeule,
}: Props) {
    const conteneur = useRef<HTMLDivElement>(null);
    const blocs = useRef<(HTMLDivElement | null)[]>([]);
    const defilementProgramme = useRef(false);

    const decoupe = pages.length > 0;

    useEffect(() => {
        if (!decoupe) return;
        const observateur = new IntersectionObserver(
            (entrees) => {
                if (defilementProgramme.current) return;
                const visible = entrees
                    .filter((e) => e.intersectionRatio > 0.5)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) {
                    const numero = Number((visible.target as HTMLElement).dataset.page);
                    if (numero) onPageVisible(numero);
                }
            },
            { root: conteneur.current, threshold: [0.5, 0.8] },
        );
        blocs.current.forEach((n) => n && observateur.observe(n));
        return () => observateur.disconnect();
    }, [decoupe, pages.length, onPageVisible]);

    useEffect(() => {
        if (!decoupe) return;
        const index = pages.findIndex((p) => p.numero === pageActive);
        const cible = blocs.current[index];
        if (!cible) return;
        defilementProgramme.current = true;
        cible.scrollIntoView({ behavior: "smooth", block: "start" });
        const t = setTimeout(() => (defilementProgramme.current = false), 700);
        return () => clearTimeout(t);
    }, [pageActive, decoupe, pages]);

    if (!decoupe) {
        return (
            <div className="flex h-full flex-col">
                <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
                    Texte extrait du PDF — non découpé par page
                </div>
                <div className="flex-1 overflow-hidden p-3">
                    <Textarea
                        value={texteEntier}
                        onChange={(e) => onTexteEntierChange(e.target.value)}
                        readOnly={lectureSeule}
                        className="h-full resize-none font-mono text-xs leading-relaxed"
                        placeholder="Aucun texte n'a pu être extrait de ce document."
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                    Page {pageActive} / {pages.length}
                </span>
                <span className="text-xs text-muted-foreground">
                    {lectureSeule ? "Lecture seule" : "Modifiable"}
                </span>
            </div>

            <div ref={conteneur} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {pages.map((page, i) => {
                    const trous = (page.texte.match(/\[illisible\]/gi) ?? []).length;
                    const active = page.numero === pageActive;
                    return (
                        <div
                            key={page.numero}
                            data-page={page.numero}
                            ref={(n) => (blocs.current[i] = n)}
                            className={`rounded-md border transition-colors ${active ? "border-primary/50 bg-primary/[0.03]" : "border-border"
                                }`}
                        >
                            <div className="flex items-center justify-between border-b px-2.5 py-1.5">
                                <span className="text-xs font-medium tabular-nums">
                                    Page {page.numero}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {trous > 0 && (
                                        <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            {trous} passage{trous > 1 ? "s" : ""} non lu{trous > 1 ? "s" : ""}
                                        </Badge>
                                    )}
                                    {page.confidence != null && (
                                        <Badge
                                            variant={page.confidence < 0.6 ? "destructive" : "outline"}
                                            className="text-[10px] font-normal tabular-nums"
                                        >
                                            {Math.round(page.confidence * 100)} %
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Textarea
                                value={page.texte}
                                onChange={(e) => onTexteChange(page.numero, e.target.value)}
                                readOnly={lectureSeule}
                                // La hauteur suit le contenu : une zone fixe imposerait un
                                // second défilement imbriqué, qui casserait l'alignement.
                                rows={Math.min(30, Math.max(6, page.texte.split("\n").length + 2))}
                                className="resize-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
                                placeholder={`Aucun texte lu sur la page ${page.numero}.`}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { MARQUEUR as MARQUEUR_ILLISIBLE };
