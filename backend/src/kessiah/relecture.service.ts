import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FilesService } from '../files/files.service';
import { KessiahService, kessiahStagingKey } from './kessiah.service';

/**
 * Relance la lecture d'une épreuve déjà lue.
 *
 * Sert quand la lecture précédente n'est plus la bonne : moteur d'OCR changé,
 * format de sortie enrichi, ou transcription faite avant une correction. Sans
 * ce geste, un document lu une fois garde sa lecture pour toujours — Kessiah
 * considère à raison qu'une épreuve d'Edukia est immuable.
 *
 * Volontairement à part de `KessiahService`, qui n'est qu'un client HTTP. Ici
 * il faut retrouver le fichier : selon l'identifiant, dans le stockage des
 * soumissions ou dans celui des épreuves, avec un détour par la base pour
 * l'UUID. Mêler cela au client rendrait ce dernier dépendant du schéma.
 */
@Injectable()
export class RelectureService {
    private readonly logger = new Logger(RelectureService.name);

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly files: FilesService,
        private readonly kessiah: KessiahService,
    ) { }

    /**
     * `id` est l'identifiant CÔTÉ KESSIAH : `submission:<uuid>` pour une
     * soumission en attente, l'identifiant numérique pour une épreuve publiée.
     */
    async relire(id: string): Promise<{ epreuve_id: string; relance: boolean }> {
        const cible = await this.localiser(id);

        const fichier = await this.files.downloadBytes(cible.entity, cible.uuid, 'file');

        await this.kessiah.requestExtraction({
            epreuveId: id,
            epreuveUuid: cible.uuid,
            pdf: new Uint8Array(fichier.body),
            filename: fichier.filename,
            // Sans cela Kessiah renoncerait : il se sert de l'insertion de sa
            // ligne comme verrou et ne retouche pas une lecture existante.
            force: true,
        });

        this.logger.log(`Relecture demandée pour ${id} (${cible.entity}/${cible.uuid}).`);
        return { epreuve_id: id, relance: true };
    }

    /** Où vit le fichier de cet identifiant. */
    private async localiser(id: string): Promise<{ entity: string; uuid: string }> {
        const prefixe = kessiahStagingKey('');
        if (id.startsWith(prefixe)) {
            return { entity: 'epreuve_submissions', uuid: id.slice(prefixe.length) };
        }

        // Épreuve publiée : le stockage est indexé par UUID, l'identifiant
        // de Kessiah est le numéro de la ligne.
        const lignes = await this.dataSource.query(
            'SELECT uuid FROM epreuves WHERE id = $1',
            [id],
        );
        const uuid = lignes?.[0]?.uuid;
        if (!uuid) {
            throw new NotFoundException(
                `Aucune épreuve ni soumission ne correspond à « ${id} » : impossible de ` +
                `retrouver son fichier pour la relire.`,
            );
        }
        return { entity: 'epreuves', uuid };
    }
}
