import { ForbiddenException } from '@nestjs/common';
import { Feature } from './entitlement.service';
import { ResultatConsommation } from './quota.service';

/**
 * Refus par épuisement du quota gratuit, au même format que celui du guard
 * d'abonnement : `error` est le contrat machine que le mobile branche sur
 * l'écran de souscription, `message` est destiné à l'affichage.
 */
export class QuotaDepasseException extends ForbiddenException {
  constructor(feature: Feature, resultat: ResultatConsommation) {
    super({
      statusCode: 403,
      error: 'QUOTA_EXCEEDED',
      message:
        feature === Feature.KETSIA_AI
          ? `Vous avez utilisé Ketsia sur votre ressource gratuite. Un abonnement est requis pour continuer.`
          : `Vous avez consulté vos ${resultat.limit} ressources gratuites. Un abonnement est requis pour continuer.`,
      feature,
      quota: { used: resultat.used, limit: resultat.limit },
    });
  }
}
