import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseHttpPaiementProvider } from './base-http.provider';
import { InitierPaiementCommande, PaiementProviderPort } from '../shared/paiement.ports';
import { PrestatairePaiement, StatutPaiement } from '../shared/paiement.enums';

@Injectable()
export class KkiaPayProvider extends BaseHttpPaiementProvider implements PaiementProviderPort {
  readonly code = PrestatairePaiement.KKIAPAY;

  constructor(config: ConfigService) {
    super(config);
  }

  async initier(cmd: InitierPaiementCommande) {
    const credentials = cmd.credentials ?? {};
    const baseUrl = this.config.get<string>('KKIAPAY_API_BASE_URL') ?? 'https://api.kkiapay.me';
    const payload = {
      amount: cmd.montant,
      currency: cmd.devise,
      callback: cmd.urlWebhook,
      return_url: cmd.urlRetour,
      phone: cmd.client.telephone,
      name: cmd.client.nom,
      email: cmd.client.email,
      reason: `Abonnement Edukia ${cmd.reference}`,
      metadata: { ...cmd.metadata, reference: cmd.reference },
    };
    const reponse = await this.postJson(`${baseUrl}/api/v1/transactions/init`, payload, {
      'x-api-key': credentials.public_key ?? this.config.get<string>('KKIAPAY_PUBLIC_KEY') ?? '',
      'x-private-key': credentials.private_key ?? this.config.get<string>('KKIAPAY_PRIVATE_KEY') ?? '',
    });
    return {
      referencePrestataire: String(reponse?.transactionId ?? reponse?.transaction_id ?? reponse?.id ?? cmd.reference),
      urlPaiement: reponse?.payment_url ?? reponse?.url ?? null,
      tokenClient: reponse?.token ?? null,
      payload: reponse,
    };
  }

  verifierSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials?: Record<string, string>): boolean {
    return this.hmacValide(rawBody, this.lire(headers, 'x-kkiapay-signature'), credentials?.webhook_secret ?? credentials?.secret ?? this.config.get<string>('KKIAPAY_SECRET'));
  }

  parserWebhook(payload: unknown) {
    return this.evenementGenerique(payload);
  }

  async verifierStatut(referencePrestataire: string, credentials?: Record<string, string>) {
    const baseUrl = this.config.get<string>('KKIAPAY_API_BASE_URL') ?? 'https://api.kkiapay.me';
    const reponse = await this.getJson(`${baseUrl}/api/v1/transactions/${referencePrestataire}`, {
      'x-api-key': credentials?.public_key ?? this.config.get<string>('KKIAPAY_PUBLIC_KEY') ?? '',
      'x-private-key': credentials?.private_key ?? this.config.get<string>('KKIAPAY_PRIVATE_KEY') ?? '',
    });
    const data = reponse?.data ?? reponse;
    return { statut: this.statutDepuis(data?.status), montant: Number(data?.amount ?? 0), devise: data?.currency ?? 'XOF' };
  }
}
