import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Code, TypeCode, TypeRemise } from './entities/code.entity';
import { CodeUtilisation } from './entities/code-utilisation.entity';

export type MotifRefus =
  | 'INTROUVABLE'
  | 'INACTIF'
  | 'PAS_ENCORE_VALIDE'
  | 'EXPIRE'
  | 'QUOTA_TOTAL_ATTEINT'
  | 'DEJA_UTILISE'
  | 'PLAN_NON_ELIGIBLE'
  | 'AUTO_UTILISATION';

export interface Remise {
  type: TypeRemise;
  valeur: number;
  montant_remise: number;
  prix_initial: number;
  prix_final: number;
}

export interface ResultatValidation {
  valide: boolean;
  motif?: MotifRefus;
  code?: { id: number; uuid: string; code: string; type: TypeCode; libelle?: string | null; proprietaire_id: number | null };
  remise?: Remise;
}

@Injectable()
export class CodeValidationService {
  private readonly logger = new Logger(CodeValidationService.name);

  constructor(
    @InjectRepository(Code) private readonly codes: Repository<Code>,
    @InjectRepository(CodeUtilisation) private readonly utilisations: Repository<CodeUtilisation>,
  ) {}

  /** Normalisation unique : la casse et les espaces ne doivent jamais départager deux codes. */
  static normaliser(code: string): string {
    return code.trim().toUpperCase();
  }

  async trouver(code: string, pays?: string): Promise<Code | null> {
    const qb = this.codes
      .createQueryBuilder('code')
      .where('upper(code.code) = :code', { code: CodeValidationService.normaliser(code) });
    // Un code est visible dans son pays ; on ne filtre que si l'appelant en fournit un.
    if (pays) qb.andWhere('code.pays = :pays', { pays });
    return qb.getOne();
  }

  /**
   * Vérifie un code SANS le consommer — pour l'aperçu avant paiement.
   *
   * La validation est refaite sous verrou au moment de consommer : entre
   * l'aperçu et l'achat, un autre acheteur peut avoir pris la dernière place.
   */
  async valider(
    codeSaisi: string,
    utilisateurId: number,
    contexte: { planId?: number; prix?: number; pays?: string } = {},
  ): Promise<ResultatValidation> {
    const code = await this.trouver(codeSaisi, contexte.pays);
    if (!code) return { valide: false, motif: 'INTROUVABLE' };

    const motif = await this.motifDeRefus(code, utilisateurId, contexte.planId);
    const resume = {
      id: code.id,
      uuid: code.uuid,
      code: code.code,
      type: code.type,
      libelle: code.libelle,
      proprietaire_id: code.proprietaire_id,
    };
    if (motif) return { valide: false, motif, code: resume };

    return {
      valide: true,
      code: resume,
      remise: contexte.prix !== undefined ? this.calculerRemise(code, contexte.prix) : undefined,
    };
  }

  /**
   * Montant de la remise accordée par un code.
   *
   * Arrondi à l'entier : le XOF n'a pas de subdivision. Le plafonnement au prix
   * évite un prix final négatif — un code « -5 000 » sur un plan à 2 000 rend
   * l'abonnement gratuit, il ne crée pas une créance.
   */
  calculerRemise(code: Code, prix: number): Remise | undefined {
    if (!code.remise_type || code.remise_valeur == null) return undefined;

    const brut =
      code.remise_type === TypeRemise.POURCENTAGE
        ? Math.round((prix * Number(code.remise_valeur)) / 100)
        : Math.round(Number(code.remise_valeur));

    const montant = Math.min(Math.max(brut, 0), prix);
    return {
      type: code.remise_type,
      valeur: Number(code.remise_valeur),
      montant_remise: montant,
      prix_initial: prix,
      prix_final: prix - montant,
    };
  }

  /**
   * Prend le verrou sur le code et revérifie sous verrou.
   *
   * ⚠️ **À appeler AVANT d'insérer la ligne qui référence le code.** Insérer
   * d'abord prend un `FOR KEY SHARE` sur la ligne de `codes` via la clé
   * étrangère ; tenter ensuite de l'élever en `FOR UPDATE` produit un
   * INTERBLOCAGE dès que deux acheteurs arrivent en même temps — observé, puis
   * corrigé par cet ordre.
   *
   * Sans ce verrou, deux acheteurs simultanés liraient tous deux « il reste une
   * place » et la prendraient : le plafond « pour n personnes » ne tiendrait pas.
   */
  async verrouillerEtValider(
    manager: EntityManager,
    codeId: number,
    utilisateurId: number,
  ): Promise<{ ok: boolean; motif?: MotifRefus; pays?: string }> {
    const [code] = await manager.query(`SELECT * FROM codes WHERE id = $1 FOR UPDATE`, [codeId]);
    if (!code) return { ok: false, motif: 'INTROUVABLE' };

    // Revérification SOUS VERROU : l'aperçu peut dater d'avant la dernière place.
    const motif = await this.motifDeRefus(code as Code, utilisateurId, undefined, manager);
    if (motif) return { ok: false, motif };
    return { ok: true, pays: code.pays };
  }

  /**
   * Enregistre l'utilisation, une fois la ligne référençante créée.
   *
   * Le verrou pris par `verrouillerEtValider` court toujours : la place ne peut
   * pas avoir été prise entre les deux.
   */
  async enregistrerUtilisation(
    manager: EntityManager,
    codeId: number,
    utilisateurId: number,
    params: { abonnementId?: number; montantRemise?: number; pays?: string },
  ): Promise<void> {
    await manager.query(
      `INSERT INTO codes_utilisations (pays, code_id, utilisateur_id, abonnement_id, montant_remise)
       VALUES ($1, $2, $3, $4, $5)`,
      [params.pays ?? 'benin', codeId, utilisateurId, params.abonnementId ?? null, params.montantRemise ?? 0],
    );
    await manager.query(`UPDATE codes SET usage_actuel = usage_actuel + 1 WHERE id = $1`, [codeId]);
  }

  /**
   * Libère une utilisation liée à un abonnement.
   *
   * Sans cela, un paiement abandonné viderait le code : les places d'une
   * campagne limitée partiraient en paniers jamais payés.
   */
  async libererPourAbonnement(abonnementId: number, manager?: EntityManager): Promise<number> {
    const repo = manager ? manager.getRepository(CodeUtilisation) : this.utilisations;
    const lignes = await repo.find({ where: { abonnement_id: abonnementId } });
    if (!lignes.length) return 0;

    for (const ligne of lignes) {
      await repo.delete(ligne.id);
      const requete = `UPDATE codes SET usage_actuel = GREATEST(usage_actuel - 1, 0) WHERE id = $1`;
      manager ? await manager.query(requete, [ligne.code_id]) : await this.codes.query(requete, [ligne.code_id]);
    }
    this.logger.log(`${lignes.length} utilisation(s) de code libérée(s) pour l'abonnement ${abonnementId}`);
    return lignes.length;
  }

  private async motifDeRefus(
    code: Code,
    utilisateurId: number,
    planId?: number,
    manager?: EntityManager,
  ): Promise<MotifRefus | null> {
    if (!code.est_actif) return 'INACTIF';

    const maintenant = new Date();
    if (code.date_debut && new Date(code.date_debut) > maintenant) return 'PAS_ENCORE_VALIDE';
    if (code.date_fin && new Date(code.date_fin) < maintenant) return 'EXPIRE';

    // Utiliser son propre code n'a aucun sens : ni remise offerte à soi-même,
    // ni commission versée à soi-même.
    if (code.proprietaire_id && code.proprietaire_id === utilisateurId) return 'AUTO_UTILISATION';

    const plans = (code as any).plans_eligibles as number[] | null;
    if (planId && plans?.length && !plans.includes(planId)) return 'PLAN_NON_ELIGIBLE';

    // Les compteurs se lisent sur le JOURNAL, pas sur `usage_actuel` : ce dernier
    // est un cache, et un écart ne doit pas laisser passer une place de trop.
    const compter = async (where: string, valeurs: any[]) => {
      const requete = `SELECT COUNT(*)::int AS n FROM codes_utilisations WHERE ${where}`;
      const [r] = manager ? await manager.query(requete, valeurs) : await this.utilisations.query(requete, valeurs);
      return Number(r?.n ?? 0);
    };

    if (code.usage_max_total != null) {
      if ((await compter('code_id = $1', [code.id])) >= code.usage_max_total) return 'QUOTA_TOTAL_ATTEINT';
    }

    const parUtilisateur = (code as any).usage_max_par_utilisateur ?? 1;
    if (parUtilisateur > 0) {
      const n = await compter('code_id = $1 AND utilisateur_id = $2', [code.id, utilisateurId]);
      if (n >= parUtilisateur) return 'DEJA_UTILISE';
    }

    return null;
  }
}
