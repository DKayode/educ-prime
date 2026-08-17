import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Client du backend Kessiah, pour la lecture des épreuves.
 *
 * Kessiah transcrit les épreuves scannées et en sert le texte à son agent. Il
 * expose pour cela une surface `/service`, réservée aux appels de serveur à
 * serveur, protégée par une clé propre (`X-Service-Key`) — distincte de la clé
 * applicative qui, elle, voyage dans chaque APK.
 *
 * Edukia n'implémente AUCUNE extraction de son côté : il déclenche celle de
 * Kessiah et relaie le verdict de l'admin. Deux implémentations concurrentes
 * du même OCR donneraient deux qualités et deux formats de sortie.
 *
 * Toutes les méthodes sont best-effort de par leur usage : une panne de
 * Kessiah ne doit jamais faire échouer l'approbation d'une soumission, au même
 * titre que le crédit du wallet.
 */
@Injectable()
export class KessiahService {
    private readonly logger = new Logger(KessiahService.name);
    private readonly baseUrl: string;
    private readonly serviceKey: string;

    /** Au-delà, on abandonne : l'appelant n'attend pas après Kessiah. */
    private static readonly TIMEOUT_MS = 20_000;

    constructor(private readonly config: ConfigService) {
        this.baseUrl = (this.config.get<string>('KESSIAH_API_BASE_URL') ?? '').replace(/\/+$/, '');
        this.serviceKey = this.config.get<string>('KESSIAH_SERVICE_KEY') ?? '';
    }

    /** Vrai quand l'intégration est configurée. Sans cela, tout est ignoré en silence. */
    get enabled(): boolean {
        return Boolean(this.baseUrl && this.serviceKey);
    }

    /**
     * Demande à Kessiah de lire une épreuve, en lui transmettant le document.
     *
     * On envoie les octets plutôt qu'une URL : au moment de l'approbation
     * aucun jeton étudiant n'existe pour que Kessiah télécharge lui-même, et
     * lui faire suivre une URL fournie par l'appelant ouvrirait une porte à
     * des requêtes sortantes arbitraires.
     *
     * Ne lève jamais : l'appelant approuve une soumission, il ne doit pas
     * échouer parce qu'un service annexe est indisponible.
     */
    async requestExtraction(params: {
        epreuveId: number | string;
        epreuveUuid?: string | null;
        pdf: Uint8Array;
        filename?: string;
    }): Promise<void> {
        if (!this.enabled) return;

        const query = params.epreuveUuid
            ? `?epreuve_uuid=${encodeURIComponent(params.epreuveUuid)}`
            : '';
        const form = new FormData();
        form.append(
            'file',
            new Blob([params.pdf as BlobPart], { type: 'application/pdf' }),
            params.filename ?? `epreuve-${params.epreuveId}.pdf`,
        );

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/service/epreuves/${params.epreuveId}/extract${query}`,
                { method: 'POST', headers: { 'X-Service-Key': this.serviceKey }, body: form },
            );
            if (!response.ok) {
                this.logger.warn(
                    `Kessiah a refusé l'extraction de l'épreuve ${params.epreuveId} (HTTP ${response.status}).`,
                );
                return;
            }
            this.logger.log(`Extraction demandée à Kessiah pour l'épreuve ${params.epreuveId}.`);
        } catch (err: any) {
            this.logger.warn(
                `Extraction Kessiah injoignable pour l'épreuve ${params.epreuveId}: ${err?.message ?? err}`,
            );
        }
    }

    /**
     * Transcription d'une épreuve, pour l'écran de relecture.
     *
     * Lève, contrairement aux autres méthodes : ici un admin attend une
     * réponse à l'écran, un échec silencieux lui laisserait croire que
     * l'épreuve n'a pas de transcription.
     */
    async getTranscription(epreuveId: number | string): Promise<KessiahTranscription | null> {
        this.assertEnabled();
        const response = await this.fetchWithTimeout(
            `${this.baseUrl}/service/epreuves/${epreuveId}/extraction`,
            { method: 'GET', headers: { 'X-Service-Key': this.serviceKey } },
        );
        if (response.status === 404) return null;
        if (!response.ok) {
            throw new ServiceUnavailableException(
                `Kessiah a répondu ${response.status} pour la transcription de l'épreuve ${epreuveId}.`,
            );
        }
        return (await response.json()) as KessiahTranscription;
    }

    /**
     * Enregistre le verdict de l'admin sur une transcription.
     *
     * C'est ce geste qui autorise Kessiah à s'appuyer sur le texte pour
     * corriger : tant qu'aucun humain n'a relu, elle s'interdit d'affirmer
     * une correction sur une lecture automatique.
     */
    async reviewTranscription(
        epreuveId: number | string,
        review: { statut: 'valide' | 'rejete'; texte?: string },
    ): Promise<KessiahReviewResult> {
        this.assertEnabled();
        const response = await this.fetchWithTimeout(
            `${this.baseUrl}/service/epreuves/${epreuveId}/extraction`,
            {
                method: 'PATCH',
                headers: { 'X-Service-Key': this.serviceKey, 'Content-Type': 'application/json' },
                body: JSON.stringify(review),
            },
        );
        if (!response.ok) {
            throw new ServiceUnavailableException(
                `Kessiah a refusé le verdict sur l'épreuve ${epreuveId} (HTTP ${response.status}).`,
            );
        }
        return (await response.json()) as KessiahReviewResult;
    }

    private assertEnabled(): void {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Intégration Kessiah non configurée (KESSIAH_API_BASE_URL / KESSIAH_SERVICE_KEY).',
            );
        }
    }

    private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), KessiahService.TIMEOUT_MS);
        try {
            return await fetch(url, { ...init, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }
}

export interface KessiahTranscription {
    epreuve_id: string;
    /** en_cours | extrait | valide | rejete */
    statut: string;
    /** text_layer | ocr */
    source: string;
    pages_pretes: number;
    pages_total: number | null;
    /** Mesurée sur le rendu de l'OCR, absente pour une couche texte native. */
    confidence: number | null;
    lisible: boolean;
    tronque: boolean;
    exercices: Array<{ index: number; title: string; start: number; end: number }>;
    texte: string;
}

export interface KessiahReviewResult {
    epreuve_id: string;
    statut: string;
    exercices: Array<{ index: number; title: string }>;
}
