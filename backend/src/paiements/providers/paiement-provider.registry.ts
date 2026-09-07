import { Inject, Injectable } from '@nestjs/common';
import { PAIEMENT_PROVIDERS } from '../shared/paiement.tokens';
import { PaiementProviderPort } from '../shared/paiement.ports';
import { PrestatairePaiement } from '../shared/paiement.enums';

@Injectable()
export class PaiementProviderRegistry {
  private readonly providers: Map<PrestatairePaiement, PaiementProviderPort>;

  constructor(@Inject(PAIEMENT_PROVIDERS) providers: PaiementProviderPort[]) {
    this.providers = new Map(providers.map((p) => [p.code, p]));
  }

  get(code: PrestatairePaiement): PaiementProviderPort {
    const provider = this.providers.get(code);
    if (!provider) throw new Error(`Prestataire de paiement non supporté: ${code}`);
    return provider;
  }
}
