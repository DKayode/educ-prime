import { BadRequestException, Injectable } from '@nestjs/common';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { RoleType, Utilisateur } from '../utilisateurs/entities/utilisateur.entity';

/**
 * Identifie une jointure entité↔type_profils. `joinTable` et `fkColumn` sont des
 * CONSTANTES internes (définies par chaque service, jamais des entrées client),
 * donc leur interpolation dans du SQL brut ne présente aucun risque d'injection.
 */
export interface TypeProfilJoinConfig {
    /** table de jointure, ex. 'opportunite_type_profils' */
    joinTable: string;
    /** colonne FK de l'entité dans la table de jointure, ex. 'opportunite_id' */
    fkColumn: string;
}

/** Contexte de l'appelant, dérivé du JWT (req.user). */
export interface ViewerContext {
    role?: string;
    utilisateurId?: number;
}

/**
 * Helper PARTAGÉ (un seul, pas 5 copies) pour le tagging + la visibilité par
 * type de profil sur les 5 entités de contenu.
 */
@Injectable()
export class TypeProfilVisibilityService {
    constructor(private readonly resolver: DataSourceResolver) { }

    /**
     * Applique la règle de visibilité à un QueryBuilder de findAll :
     * un appelant NON-admin ne voit une ligne que si elle est NON-TAGUÉE
     * (aucune ligne de jointure) OU si elle partage le type_profil_id de
     * l'appelant. Les admins (et les contextes sans viewer, ex. appels
     * internes/panel admin) ne sont PAS affectés — aucun filtre ajouté.
     */
    async applyVisibilityFilter(
        qb: SelectQueryBuilder<any>,
        alias: string,
        cfg: TypeProfilJoinConfig,
        viewer?: ViewerContext,
    ): Promise<void> {
        // Admins & contextes sans viewer : inchangés.
        if (!viewer || viewer.role === RoleType.ADMIN) return;

        const typeProfilId = await this.resolveViewerTypeProfilId(viewer.utilisateurId);

        const untagged =
            `NOT EXISTS (SELECT 1 FROM ${cfg.joinTable} j WHERE j.${cfg.fkColumn} = ${alias}.id)`;

        if (typeProfilId == null) {
            // Appelant sans type_profil → uniquement les lignes non-taguées (publiques). Intentionnel.
            qb.andWhere(untagged);
            return;
        }

        qb.andWhere(
            new Brackets((w) => {
                w.where(untagged).orWhere(
                    `EXISTS (SELECT 1 FROM ${cfg.joinTable} j WHERE j.${cfg.fkColumn} = ${alias}.id AND j.type_profil_id = :__viewerTypeProfilId)`,
                    { __viewerTypeProfilId: typeProfilId },
                );
            }),
        );
    }

    /**
     * Variante COMPLÉMENT pour les services basés sur repository.findAndCount
     * (pas de QueryBuilder — ex. forum). Renvoie les ids d'entités CACHÉES pour
     * l'appelant (= taguées ET ne partageant PAS son type_profil), à exclure via
     * `where.id = Not(In(...))`. Renvoie null si aucun filtre ne s'applique
     * (admin / sans viewer). Même règle que applyVisibilityFilter, exprimée en
     * complément ; l'ensemble est borné par le nombre de lignes TAGUÉES (minorité).
     */
    async hiddenEntityIds(cfg: TypeProfilJoinConfig, viewer?: ViewerContext): Promise<number[] | null> {
        if (!viewer || viewer.role === RoleType.ADMIN) return null;

        const typeProfilId = await this.resolveViewerTypeProfilId(viewer.utilisateurId);
        const ds = this.resolver.getDataSource();

        let rows: any[];
        if (typeProfilId == null) {
            // Sans type_profil → toutes les lignes taguées sont cachées.
            rows = await ds.query(`SELECT DISTINCT ${cfg.fkColumn} AS id FROM ${cfg.joinTable}`);
        } else {
            // Taguées SANS aucun tag correspondant au type_profil de l'appelant.
            rows = await ds.query(
                `SELECT ${cfg.fkColumn} AS id FROM ${cfg.joinTable}
                 GROUP BY ${cfg.fkColumn}
                 HAVING SUM(CASE WHEN type_profil_id = $1 THEN 1 ELSE 0 END) = 0`,
                [typeProfilId],
            );
        }
        return rows.map((r) => Number(r.id));
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
