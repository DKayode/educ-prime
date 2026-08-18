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
/**
 * Clé provisoire sous laquelle une soumission est transcrite.
 *
 * L'épreuve réelle — et donc son identifiant — n'existe qu'à l'approbation.
 * Transcrire dès le dépôt suppose donc une clé intermédiaire, remplacée par
 * l'identifiant définitif via `adoptTranscription`. Le préfixe garantit
 * l'absence de collision avec un identifiant d'épreuve.
 *
 * L'espace d'identifiants de Kessiah est donc fait de CHAÎNES, non d'entiers :
 * les routes de relecture ne peuvent pas imposer un identifiant numérique,
 * sous peine de rejeter en 400 les soumissions et les épreuves héritées dont
 * l'identifiant ne l'est pas.
 */
export function kessiahStagingKey(submissionUuid: string): string {
    return `submission:${submissionUuid}`;
}

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
        /**
         * Efface la lecture précédente avant de relire. Indispensable pour une
         * relecture : Kessiah se sert de l'insertion de sa ligne comme verrou
         * et renonce quand elle existe, si bien qu'une relecture sans remise à
         * zéro ne referait rien — en silence.
         */
        force?: boolean;
    }): Promise<void> {
        if (!this.enabled) return;

        const parametres = new URLSearchParams();
        if (params.epreuveUuid) parametres.append('epreuve_uuid', params.epreuveUuid);
        if (params.force) parametres.append('force', 'true');
        const query = parametres.toString() ? `?${parametres}` : '';
        const form = new FormData();
        form.append(
            'file',
            new Blob([params.pdf as BlobPart], { type: 'application/pdf' }),
            params.filename ?? `epreuve-${params.epreuveId}.pdf`,
        );

        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/service/epreuves/${encodeURIComponent(String(params.epreuveId))}/extract${query}`,
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
     * Rattache à l'épreuve la transcription faite au dépôt de sa soumission.
     *
     * Une épreuve n'existe qu'à l'approbation : elle est donc transcrite
     * avant, sous la clé de sa soumission. Renvoie `false` si rien n'a été
     * transcrit — l'appelant retombe alors sur une extraction classique.
     *
     * Ne lève jamais, pour la même raison que `requestExtraction`.
     */
    async adoptTranscription(
        epreuveId: number | string,
        sourceId: string,
    ): Promise<boolean> {
        if (!this.enabled) return false;
        try {
            const response = await this.fetchWithTimeout(
                `${this.baseUrl}/service/epreuves/${encodeURIComponent(String(epreuveId))}/adopt`,
                {
                    method: 'POST',
                    headers: { 'X-Service-Key': this.serviceKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_id: sourceId }),
                },
            );
            if (!response.ok) return false;
            const body = (await response.json()) as { adopte?: boolean };
            return Boolean(body?.adopte);
        } catch (err: any) {
            this.logger.warn(
                `Adoption de transcription impossible (épreuve ${epreuveId}): ${err?.message ?? err}`,
            );
            return false;
        }
    }

    /**
     * État de lecture de plusieurs épreuves, en un appel.
     *
     * Évite au back-office un aller-retour par ligne pour afficher la file de
     * modération. Renvoie une table vide en cas d'échec : l'écran doit
     * s'afficher même si Kessiah ne répond pas.
     */
    /**
     * Comme [getStates], mais distingue « rien à signaler » de « je n'ai pas pu
     * demander » : rend `null` quand Kessiah est injoignable ou désactivé.
     *
     * La nuance décide d'une action. Une épreuve absente d'une réponse REÇUE
     * n'a jamais été lue, et mérite qu'on lance sa lecture ; la même absence
     * dans une réponse JAMAIS OBTENUE ne dit rien du tout, et lancer une
     * lecture sur cette base rejouerait une transcription déjà faite. Les deux
     * cas donnaient la même table vide.
     */
    async getStatesOrUnknown(
        ids: Array<number | string>,
    ): Promise<Record<string, KessiahExtractionState> | null> {
        if (!this.enabled) return null;
        if (ids.length === 0) return {};
        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/service/extractions/states`, {
                method: 'POST',
                headers: { 'X-Service-Key': this.serviceKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ epreuve_ids: ids.map(String) }),
            });
            if (!response.ok) return null;
            const body = (await response.json()) as { etats?: Record<string, KessiahExtractionState> };
            return body?.etats ?? {};
        } catch (err: any) {
            this.logger.warn(`États de lecture indisponibles: ${err?.message ?? err}`);
            return null;
        }
    }

    async getStates(ids: Array<number | string>): Promise<Record<string, KessiahExtractionState>> {
        if (!this.enabled || ids.length === 0) return {};
        try {
            const response = await this.fetchWithTimeout(`${this.baseUrl}/service/extractions/states`, {
                method: 'POST',
                headers: { 'X-Service-Key': this.serviceKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ epreuve_ids: ids.map(String) }),
            });
            if (!response.ok) return {};
            const body = (await response.json()) as { etats?: Record<string, KessiahExtractionState> };
            return body?.etats ?? {};
        } catch (err: any) {
            this.logger.warn(`États de lecture indisponibles: ${err?.message ?? err}`);
            return {};
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
            `${this.baseUrl}/service/epreuves/${encodeURIComponent(String(epreuveId))}/extraction`,
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
            `${this.baseUrl}/service/epreuves/${encodeURIComponent(String(epreuveId))}/extraction`,
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

    /**
     * Inventaire des transcriptions, pour le tableau de bord Ketsia.
     *
     * Kessiah ne connaît des épreuves que leur identifiant : les titres,
     * matières et niveaux vivent ici. L'appelant joint donc lui-même les deux
     * jeux — répliquer le catalogue d'Edukia dans Kessiah créerait deux
     * vérités à maintenir.
     */
    async listExtractions(params: {
        statut?: string;
        lisible?: boolean;
        source?: string;
        recherche?: string;
        page?: number;
        limit?: number;
    }): Promise<KessiahExtractionList> {
        this.assertEnabled();
        const qs = new URLSearchParams();
        if (params.statut) qs.append('statut', params.statut);
        if (params.lisible !== undefined) qs.append('lisible', String(params.lisible));
        if (params.source) qs.append('source', params.source);
        if (params.recherche) qs.append('recherche', params.recherche);
        if (params.page) qs.append('page', String(params.page));
        if (params.limit) qs.append('limit', String(params.limit));

        const response = await this.fetchWithTimeout(
            `${this.baseUrl}/service/extractions${qs.toString() ? `?${qs}` : ''}`,
            { method: 'GET', headers: { 'X-Service-Key': this.serviceKey } },
        );
        if (!response.ok) {
            throw new ServiceUnavailableException(
                `Kessiah a répondu ${response.status} pour l'inventaire des transcriptions.`,
            );
        }
        return (await response.json()) as KessiahExtractionList;
    }

    /** Compteurs du tableau de bord : statuts, sources, lisibilité, volume. */
    async getStatistics(): Promise<KessiahExtractionStats> {
        this.assertEnabled();
        const response = await this.fetchWithTimeout(
            `${this.baseUrl}/service/extractions/stats`,
            { method: 'GET', headers: { 'X-Service-Key': this.serviceKey } },
        );
        if (!response.ok) {
            throw new ServiceUnavailableException(
                `Kessiah a répondu ${response.status} pour les statistiques de transcription.`,
            );
        }
        return (await response.json()) as KessiahExtractionStats;
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

export interface KessiahExtractionState {
    statut: string;
    source: string;
    pages_pretes: number;
    pages_total: number | null;
    confidence: number | null;
    lisible: boolean;
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
    /** Découpe par page, pour l'affichage côte à côte. Vide pour une couche texte. */
    pages: Array<{ numero: number; texte: string; confidence: number | null }>;
}

export interface KessiahReviewResult {
    epreuve_id: string;
    statut: string;
    exercices: Array<{ index: number; title: string }>;
}

export interface KessiahExtractionRow {
    epreuve_id: string;
    epreuve_uuid: string | null;
    statut: string;
    source: string;
    pages_pretes: number;
    pages_total: number | null;
    confidence: number | null;
    lisible: boolean;
    tronque: boolean;
    exercices: number;
    caracteres: number;
    mis_a_jour: string | null;
}

export interface KessiahExtractionList {
    data: KessiahExtractionRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface KessiahExtractionStats {
    total: number;
    par_statut: Record<string, number>;
    par_source: Record<string, number>;
    lisibles: number;
    illisibles: number;
    en_cours: number;
    tronques: number;
    pages_transcrites: number;
    confiance_moyenne: number | null;
}
