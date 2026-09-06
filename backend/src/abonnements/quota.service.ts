import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  FeatureQuota,
  QuotaConsommation,
  TypeRessourceQuota,
} from './entities/quota-consommation.entity';

/** Ressources académiques distinctes consultables sans abonnement. */
export const QUOTA_RESSOURCES_GRATUITES = 5;
/** Ressources sur lesquelles Ketsia peut être lancée sans abonnement. */
export const QUOTA_KETSIA_GRATUIT = 1;

export const PLAFOND_PAR_FEATURE: Record<FeatureQuota, number> = {
  [FeatureQuota.RESOURCE_VIEW]: QUOTA_RESSOURCES_GRATUITES,
  [FeatureQuota.KETSIA_AI]: QUOTA_KETSIA_GRATUIT,
};

export interface ResultatConsommation {
  allowed: boolean;
  used: number;
  limit: number;
  /** `false` quand la ressource avait déjà été consommée : rien n'a été décompté. */
  nouveau: boolean;
}

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    @InjectRepository(QuotaConsommation)
    private readonly consommations: Repository<QuotaConsommation>,
  ) {}

  limite(feature: FeatureQuota): number {
    return PLAFOND_PAR_FEATURE[feature];
  }

  /** Lecture seule : ressources distinctes déjà consommées pour cette feature. */
  async compter(utilisateurId: number, feature: FeatureQuota): Promise<number> {
    if (!utilisateurId) return 0;
    return this.consommations.count({ where: { utilisateur_id: utilisateurId, feature } });
  }

  /**
   * Consomme le quota pour une ressource donnée.
   *
   * L'unicité en base fait tout le travail : on tente l'insertion, et un
   * conflit signifie que la ressource était déjà consommée — donc autorisée
   * sans rien décompter. Compter puis insérer laisserait passer deux requêtes
   * concurrentes sur la 5ᵉ unité ; ici la base tranche.
   */
  async consommer(
    utilisateurId: number,
    feature: FeatureQuota,
    resourceType: TypeRessourceQuota,
    resourceId: number,
    pays: string,
  ): Promise<ResultatConsommation> {
    const limit = this.limite(feature);

    const dejaConsommee = await this.consommations.findOne({
      where: { utilisateur_id: utilisateurId, feature, resource_type: resourceType, resource_id: resourceId },
    });
    if (dejaConsommee) {
      const used = await this.compter(utilisateurId, feature);
      return { allowed: true, used, limit, nouveau: false };
    }

    const used = await this.compter(utilisateurId, feature);
    if (used >= limit) {
      return { allowed: false, used, limit, nouveau: false };
    }

    try {
      await this.consommations.insert({
        pays,
        utilisateur_id: utilisateurId,
        feature,
        resource_type: resourceType,
        resource_id: resourceId,
      });
      return { allowed: true, used: used + 1, limit, nouveau: true };
    } catch (err) {
      // 23505 : une requête concurrente a inséré la même ligne entre-temps.
      // La ressource est bien consommée, et une seule fois — on autorise.
      if (String(err?.code) === '23505') {
        return { allowed: true, used: await this.compter(utilisateurId, feature), limit, nouveau: false };
      }
      throw err;
    }
  }

  /**
   * Identifiants déjà consommés pour un type de ressource.
   *
   * Sert le drapeau `deja_consultee` des listes : une seule requête par appel
   * HTTP, jamais une par ligne. Sans lui, l'application ferait croire qu'ouvrir
   * une ressource déjà vue coûte une unité.
   */
  async ressourcesConsommees(
    utilisateurId: number,
    feature: FeatureQuota,
    resourceType: TypeRessourceQuota,
  ): Promise<Set<number>> {
    if (!utilisateurId) return new Set();
    const lignes = await this.consommations.find({
      where: { utilisateur_id: utilisateurId, feature, resource_type: resourceType },
      select: ['resource_id'],
    });
    return new Set(lignes.map((l) => l.resource_id));
  }

  /** Vue admin : consommation d'un utilisateur, toutes features confondues. */
  async etatPourUtilisateur(utilisateurId: number) {
    const features = Object.values(FeatureQuota);
    const comptes = await Promise.all(features.map((f) => this.compter(utilisateurId, f)));
    return features.reduce(
      (acc, f, i) => ({ ...acc, [f]: { used: comptes[i], limit: this.limite(f) } }),
      {} as Record<FeatureQuota, { used: number; limit: number }>,
    );
  }
}
