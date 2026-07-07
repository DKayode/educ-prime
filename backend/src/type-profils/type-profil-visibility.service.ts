import { BadRequestException, Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CountryContextService } from '../config/country-context.service';
import { RoleType, Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { EntityTypeProfil } from './entities/entity-type-profil.entity';

/**
 * Identifie une entité de contenu pour la visibilité par type de profil.
 * `entity` sert au REGISTRE (entity_type_profil). `joinTable`/`fkColumn` sont
 * hérités du tagging par-ligne (désormais dormant) et restent des CONSTANTES
 * internes (jamais des entrées client).
 */
export interface TypeProfilJoinConfig {
    /** nom d'entité pour le registre, ex. 'evenement' */
    entity: string;
    /** table de jointure héritée (dormant), ex. 'opportunite_type_profils' */
    joinTable: string;
    /** colonne FK héritée (dormant), ex. 'opportunite_id' */
    fkColumn: string;
}

/** Contexte de l'appelant, dérivé du JWT (req.user). */
export interface ViewerContext {
    role?: string;
    utilisateurId?: number;
}

/**
 * Helper PARTAGÉ pour la visibilité par type de profil (modèle REGISTRE).
 * L'audience est gérée AU NIVEAU DE L'ENTITÉ via `entity_type_profil` :
 * une entité non associée est publique ; sinon elle n'est visible que par les
 * appelants partageant le type_profil associé. Les admins ne sont pas filtrés.
 */
@Injectable()
export class TypeProfilVisibilityService {
    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly context: CountryContextService,
    ) { }

    /**
     * QueryBuilder findAll : si l'entité est masquée pour l'appelant, aucune
     * ligne ne remonte (`1 = 0`). `alias` conservé pour compat de signature.
     */
    async applyVisibilityFilter(
        qb: SelectQueryBuilder<any>,
        alias: string,
        cfg: TypeProfilJoinConfig,
        viewer?: ViewerContext,
    ): Promise<void> {
        if (await this.isEntityHidden(cfg, viewer)) qb.andWhere('1 = 0');
    }

    /**
     * Vrai si l'entité entière est masquée pour l'appelant. Pour les services
     * basés sur repository.findAndCount (ex. forum) : renvoyer une page vide.
     */
    async isEntityHidden(cfg: TypeProfilJoinConfig, viewer?: ViewerContext): Promise<boolean> {
        if (!viewer || viewer.role === RoleType.ADMIN) return false;
        const pays = this.context.getCountry();
        const entityTypeProfilIds = await this.getEntityAssociations(pays, cfg.entity);
        if (entityTypeProfilIds.length === 0) return false; // non associée → publique
        const viewerTypeProfilId = await this.resolveViewerTypeProfilId(viewer.utilisateurId);
        // Visible si l'appelant partage l'UN des types de profil associés à l'entité.
        return viewerTypeProfilId == null || !entityTypeProfilIds.includes(viewerTypeProfilId);
    }

    private async getEntityAssociations(pays: string, entity: string): Promise<number[]> {
        const rows = await this.resolver
            .getRepository(EntityTypeProfil)
            .find({ where: { entity, pays } });
        return rows.map((r) => r.type_profil_id);
    }

    /** Lit la checklist (ids de type_profil) taguée sur une ligne d'entité. */
    async getTypeProfilIds(cfg: TypeProfilJoinConfig, entityId: number): Promise<number[]> {
        const rows = await this.resolver
            .getDataSource()
            .query(
                `SELECT type_profil_id FROM ${cfg.joinTable} WHERE ${cfg.fkColumn} = $1 ORDER BY type_profil_id`,
                [entityId],
            );
        return rows.map((r: any) => Number(r.type_profil_id));
    }

    /**
     * Remplace intégralement (replace-set, transactionnel) la checklist d'une
     * ligne d'entité. Valide d'abord que chaque type_profil existe (évite une
     * violation de FK renvoyée en 500). Renvoie la checklist résultante.
     */
    async setTypeProfilIds(
        cfg: TypeProfilJoinConfig,
        entityId: number,
        typeProfilIds: number[],
    ): Promise<number[]> {
        const unique = Array.from(
            new Set((typeProfilIds ?? []).map((n) => Number(n)).filter((n) => Number.isInteger(n))),
        );

        const ds = this.resolver.getDataSource();

        if (unique.length) {
            const existing = await ds.query(`SELECT id FROM type_profils WHERE id = ANY($1)`, [unique]);
            const existingIds = new Set(existing.map((r: any) => Number(r.id)));
            const missing = unique.filter((id) => !existingIds.has(id));
            if (missing.length) {
                throw new BadRequestException(`Type(s) de profil introuvable(s): ${missing.join(', ')}`);
            }
        }

        await ds.transaction(async (em) => {
            await em.query(`DELETE FROM ${cfg.joinTable} WHERE ${cfg.fkColumn} = $1`, [entityId]);
            for (const tpId of unique) {
                await em.query(
                    `INSERT INTO ${cfg.joinTable} (${cfg.fkColumn}, type_profil_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [entityId, tpId],
                );
            }
        });

        return this.getTypeProfilIds(cfg, entityId);
    }

    private async resolveViewerTypeProfilId(utilisateurId?: number): Promise<number | null> {
        if (!utilisateurId) return null;
        const row = await this.resolver.getRepository(Utilisateur).findOne({
            where: { id: utilisateurId },
            select: ['id', 'type_profil_id'],
        });
        return row?.type_profil_id ?? null;
    }
}
