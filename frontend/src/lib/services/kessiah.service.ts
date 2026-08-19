import { api } from '../api';

/**
 * Relecture des transcriptions d'épreuves produites par Kessiah.
 *
 * Kessiah lit automatiquement chaque épreuve validée — couche texte du PDF
 * quand il en a une, transcription par un modèle vision pour les scans. Une
 * lecture automatique n'est pas une lecture sûre : tant qu'un humain ne l'a
 * pas relue, l'assistante s'interdit d'affirmer une correction sur cette base.
 * Ces appels servent à lever cette réserve, ou à rejeter une transcription
 * inexploitable.
 */

export type TranscriptionStatut = 'en_cours' | 'extrait' | 'valide' | 'rejete';

export interface TranscriptionExercice {
    index: number;
    title: string;
    start: number;
    end: number;
}

export interface Transcription {
    epreuve_id: string;
    /**
     * UUID de l'épreuve côté Edukia, `null` pour une soumission.
     *
     * Le stockage objet est indexé par UUID, pas par identifiant numérique :
     * c'est la seule clé permettant de retrouver le FICHIER d'une épreuve
     * publiée, et donc d'afficher le document en regard de sa transcription.
     */
    epreuve_uuid: string | null;
    statut: TranscriptionStatut;
    /** `text_layer` : lue directement dans le PDF. `ocr` : transcrite d'un scan. */
    source: 'text_layer' | 'ocr';
    pages_pretes: number;
    pages_total: number | null;
    /**
     * Fiabilité mesurée sur le rendu de l'OCR, entre 0 et 1. Nulle pour une
     * couche texte native, qui est exacte par construction.
     */
    confidence: number | null;
    lisible: boolean;
    tronque: boolean;
    exercices: TranscriptionExercice[];
    texte: string;
    /**
     * Découpe par page, pour l'affichage en regard du document. Vide quand le
     * texte vient d'une couche PDF, extraite d'un bloc : il n'y a alors rien
     * à apparier page par page.
     */
    pages: TranscriptionPage[];
}

export interface TranscriptionPage {
    numero: number;
    texte: string;
    confidence: number | null;
}

/**
 * Ce qu'on relit : une épreuve déjà publiée, ou une soumission encore en
 * attente.
 *
 * Le second cas est le chemin nominal. La transcription part à l'ouverture de
 * la file de modération, sans attendre l'approbation : le temps que l'admin
 * descende jusqu'à une ligne, la lecture est prête, et il valide le document
 * et sa transcription d'un même geste. L'attacher à l'approbation aurait
 * imposé un second passage, qui n'aurait jamais eu lieu.
 */
export type TranscriptionTarget =
    | { kind: 'epreuve'; id: number | string }
    | { kind: 'submission'; uuid: string };

function targetPath(target: TranscriptionTarget): string {
    return target.kind === 'submission'
        ? `/kessiah/epreuves/submissions/${target.uuid}/transcription`
        : `/kessiah/epreuves/${target.id}/transcription`;
}

export const kessiahService = {
    /**
     * Relance la lecture d'une épreuve, en effaçant la précédente.
     *
     * Utile après une amélioration de l'OCR, ou pour une lecture ancienne dont
     * la structure a changé — une transcription faite avant le découpage par
     * page, par exemple, s'affiche en un seul pavé.
     *
     * Le verdict précédent est perdu : le texte relu n'est plus celui qui
     * avait été validé, le reconduire reviendrait à valider ce que personne
     * n'a lu.
     */
    async relire(epreuveId: string): Promise<{ epreuve_id: string; relance: boolean }> {
        return api.post(`/kessiah/epreuves/extractions/${encodeURIComponent(epreuveId)}/relire`, {});
    },

    /** `null` quand Kessiah n'a pas encore terminé la lecture. */
    async getTranscription(target: TranscriptionTarget): Promise<Transcription | null> {
        try {
            return await api.get<Transcription>(targetPath(target));
        } catch (err: any) {
            if (err?.statusCode === 404) return null;
            throw err;
        }
    },

    /**
     * Enregistre le verdict. `texte` permet de corriger une coquille plutôt
     * que de rejeter en bloc : l'admin a le document sous les yeux.
     */
    async review(
        target: TranscriptionTarget,
        review: { statut: 'valide' | 'rejete'; texte?: string },
    ): Promise<{ epreuve_id: string; statut: TranscriptionStatut }> {
        return api.patch(targetPath(target), review);
    },
};

/** Une ligne de l'inventaire des transcriptions. */
export interface ExtractionRow {
    epreuve_id: string;
    epreuve_uuid: string | null;
    statut: TranscriptionStatut;
    source: 'text_layer' | 'ocr';
    pages_pretes: number;
    pages_total: number | null;
    confidence: number | null;
    lisible: boolean;
    tronque: boolean;
    exercices: number;
    caracteres: number;
    mis_a_jour: string | null;
}

export interface ExtractionStats {
    total: number;
    par_statut: Record<TranscriptionStatut, number>;
    par_source: Record<'text_layer' | 'ocr', number>;
    /**
     * `lisibles + illisibles + en_cours = total`. Une lecture en cours n'est
     * comptée d'aucun des deux côtés : la classer avant la fin serait un
     * jugement prématuré, et ferait clignoter le tableau à chaque dépôt.
     */
    lisibles: number;
    illisibles: number;
    en_cours: number;
    tronques: number;
    pages_transcrites: number;
    confiance_moyenne: number | null;
}

export interface ExtractionListe {
    data: ExtractionRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const ketsiaInventaireService = {
    async liste(params: {
        statut?: string;
        lisible?: boolean;
        source?: string;
        recherche?: string;
        page?: number;
        limit?: number;
    } = {}): Promise<ExtractionListe> {
        const qs = new URLSearchParams();
        if (params.statut) qs.append('statut', params.statut);
        if (params.lisible !== undefined) qs.append('lisible', String(params.lisible));
        if (params.source) qs.append('source', params.source);
        if (params.recherche) qs.append('recherche', params.recherche);
        if (params.page) qs.append('page', String(params.page));
        if (params.limit) qs.append('limit', String(params.limit));
        const suffixe = qs.toString() ? `?${qs}` : '';
        return api.get<ExtractionListe>(`/kessiah/epreuves/extractions${suffixe}`);
    },

    async stats(): Promise<ExtractionStats> {
        return api.get<ExtractionStats>('/kessiah/epreuves/extractions/stats');
    },
};
