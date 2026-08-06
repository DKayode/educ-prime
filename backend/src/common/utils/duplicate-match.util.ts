import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

// Anti-doublon des soumissions (épreuves, concours, examens nationaux).
// Chaque niveau de classement arrive soit en id existant, soit en nom proposé :
// les deux formes désignent la même chose et doivent entrer en collision.
// La comparaison passe par `unaccent` + `lower` — « mathematiques », « MATHÉMATIQUES »
// et « Mathématiques » sont le même libellé.

/** Retrouve un lookup par nom (casse et accents ignorés) dans le pays courant. */
export async function findLookupByName<T extends ObjectLiteral>(
    repo: Repository<T>,
    pays: string,
    nom?: string | null,
    scope?: (qb: SelectQueryBuilder<T>) => void,
): Promise<T | null> {
    const n = nom?.trim();
    if (!n) return null;
    const qb = repo.createQueryBuilder('l')
        .where('l.pays = :pays', { pays })
        .andWhere('unaccent(lower(l.nom)) = unaccent(lower(:n))', { n });
    scope?.(qb);
    return qb.getOne();
}

/**
 * Contraint `qb` à ne garder que les lignes dont ce niveau vaut `id` OU porte le
 * nom proposé équivalent. Sans id ni nom, exige que le niveau soit vide des deux
 * côtés — deux soumissions « sans filière » restent des doublons.
 */
export function applyLevelMatch(
    qb: SelectQueryBuilder<any>,
    alias: string,
    idCol: string,
    proposedCol: string,
    id: number | null | undefined,
    nom: string | null | undefined,
    key: string,
): void {
    const n = nom?.trim() || null;
    const sameName = `(${alias}.${idCol} IS NULL AND unaccent(lower(${alias}.${proposedCol})) = unaccent(lower(:${key}n)))`;

    if (id != null && n) {
        qb.andWhere(`(${alias}.${idCol} = :${key}i OR ${sameName})`, { [`${key}i`]: id, [`${key}n`]: n });
    } else if (id != null) {
        qb.andWhere(`${alias}.${idCol} = :${key}i`, { [`${key}i`]: id });
    } else if (n) {
        qb.andWhere(sameName, { [`${key}n`]: n });
    } else {
        qb.andWhere(`${alias}.${idCol} IS NULL AND ${alias}.${proposedCol} IS NULL`);
    }
}
