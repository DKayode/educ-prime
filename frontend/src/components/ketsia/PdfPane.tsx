import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, FileWarning, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Rendu du PDF, page par page, pour l'affichage en regard de sa transcription.
 *
 * Une <iframe> aurait suffi à MONTRER le document, mais pas à le synchroniser :
 * le lecteur PDF du navigateur n'expose ni sa page courante ni sa position de
 * défilement, et son contenu est inaccessible depuis la page hôte. Rendre
 * nous-mêmes est le seul moyen de savoir quelle page est à l'écran, et donc
 * d'afficher la bonne transcription en face.
 *
 * Le défilement est continu plutôt que page à page : c'est ainsi qu'on lit un
 * document, et cela permet de repérer la page réellement regardée — celle qui
 * occupe le plus la fenêtre — plutôt que d'imposer une navigation par boutons.
 */

// Le worker est servi depuis nos propres fichiers : le charger depuis un CDN
// ferait dépendre le back-office d'un tiers, et échouerait hors ligne.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

interface Props {
    url: string;
    /** Page à afficher, demandée par le volet d'en face. */
    pageActive: number;
    /** Émis quand l'utilisateur fait défiler et change de page ici. */
    onPageVisible: (page: number) => void;
    onPagesChargees: (total: number) => void;
}

export function PdfPane({ url, pageActive, onPageVisible, onPagesChargees }: Props) {
    const [total, setTotal] = useState(0);
    const [erreur, setErreur] = useState<string | null>(null);
    const [echelle, setEchelle] = useState(1);
    const [largeur, setLargeur] = useState(560);

    const conteneur = useRef<HTMLDivElement>(null);
    const pages = useRef<(HTMLDivElement | null)[]>([]);
    // Verrou anti-boucle : sans lui, faire défiler ici notifie le volet
    // d'en face, qui nous redemande une page, ce qui redéclenche un défilement.
    const defilementProgramme = useRef(false);

    // Le rendu de react-pdf est en pixels : sans largeur explicite, la page
    // garde sa taille intrinsèque et déborde du volet quand on le rétrécit.
    useEffect(() => {
        if (!conteneur.current) return;
        const observateur = new ResizeObserver(([entree]) => {
            setLargeur(Math.max(240, entree.contentRect.width - 32));
        });
        observateur.observe(conteneur.current);
        return () => observateur.disconnect();
    }, []);

    // Suit la page réellement à l'écran. Le seuil de 55 % évite l'oscillation
    // quand deux pages se partagent la fenêtre à parts presque égales.
    useEffect(() => {
        if (!total) return;
        const observateur = new IntersectionObserver(
            (entrees) => {
                if (defilementProgramme.current) return;
                const visible = entrees
                    .filter((e) => e.intersectionRatio > 0.55)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) {
                    const numero = Number((visible.target as HTMLElement).dataset.page);
                    if (numero) onPageVisible(numero);
                }
            },
            { root: conteneur.current, threshold: [0.55, 0.8] },
        );
        pages.current.forEach((noeud) => noeud && observateur.observe(noeud));
        return () => observateur.disconnect();
    }, [total, onPageVisible]);

    // Suit la page demandée par le volet d'en face.
    useEffect(() => {
        const cible = pages.current[pageActive - 1];
        if (!cible) return;
        defilementProgramme.current = true;
        cible.scrollIntoView({ behavior: "smooth", block: "start" });
        // Le défilement doux n'a pas d'événement de fin : on relâche le verrou
        // après une durée qui le couvre largement.
        const t = setTimeout(() => (defilementProgramme.current = false), 700);
        return () => clearTimeout(t);
    }, [pageActive]);

    if (erreur) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <FileWarning className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{erreur}</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                    {total ? `Page ${pageActive} / ${total}` : "Chargement…"}
                </span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEchelle((e) => Math.max(0.5, e - 0.15))}>
                        <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
                        {Math.round(echelle * 100)}%
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setEchelle((e) => Math.min(2.5, e + 0.15))}>
                        <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div ref={conteneur} className="flex-1 overflow-y-auto bg-muted/40 px-4 py-3">
                <Document
                    file={url}
                    onLoadSuccess={({ numPages }) => {
                        setTotal(numPages);
                        pages.current = new Array(numPages).fill(null);
                        onPagesChargees(numPages);
                    }}
                    onLoadError={(e) =>
                        setErreur(`Document illisible par le navigateur : ${e.message}`)
                    }
                    loading={
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    }
                >
                    {Array.from({ length: total }, (_, i) => (
                        <div
                            key={i}
                            data-page={i + 1}
                            ref={(n) => (pages.current[i] = n)}
                            className="mb-4 flex justify-center"
                        >
                            <Page
                                pageNumber={i + 1}
                                width={largeur * echelle}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-sm ring-1 ring-border"
                            />
                        </div>
                    ))}
                </Document>
            </div>
        </div>
    );
}
