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
}

/**
 * Ce qu'on relit : une épreuve déjà publiée, ou une soumission encore en
 * attente. Le second cas est le chemin nominal — la transcription est lancée
 * dès le dépôt, si bien qu'à l'ouverture de la file de modération elle est
 * prête, et l'admin valide le document et sa lecture d'un même geste.
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
