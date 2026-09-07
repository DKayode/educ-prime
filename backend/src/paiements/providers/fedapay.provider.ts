import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseHttpPaiementProvider } from './base-http.provider';
import { InitierPaiementCommande, PaiementProviderPort } from '../shared/paiement.ports';
import { PrestatairePaiement } from '../shared/paiement.enums';

@Injectable()
export class FedaPayProvider extends BaseHttpPaiementProvider implements PaiementProviderPort {
  readonly code = PrestatairePaiement.FEDAPAY;

  constructor(config: ConfigService) {
    super(config);
  }

  async initier(cmd: InitierPaiementCommande) {
    const credentials = cmd.credentials ?? {};
    const baseUrl = this.config.get<string>('FEDAPAY_API_BASE_URL') ?? 'https://api.fedapay.com/v1';
    const payload = {
      description: `Abonnement Edukia ${cmd.reference}`,
      amount: cmd.montant,
      currency: { iso: cmd.devise },
      callback_url: cmd.urlWebhook,
      return_url: cmd.urlRetour,
      customer: { firstname: cmd.client.nom, email: cmd.client.email, phone_number: cmd.client.telephone },
      metadata: { ...cmd.metadata, reference: cmd.reference },
    };
    const reponse = await this.postJson(`${baseUrl}/transactions`, payload, {
      Authorization: `Bearer ${credentials.secret_key ?? this.config.get<string>('FEDAPAY_SECRET_KEY') ?? ''}`,
    });
    const data = reponse?.transaction ?? reponse?.data ?? reponse;
    return {
      referencePrestataire: String(data?.id ?? cmd.reference),
      urlPaiement: data?.payment_url ?? data?.url ?? null,
      tokenClient: data?.token ?? null,
      payload: reponse,
    };
  }

  verifierSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials?: Record<string, string>): boolean {
    return this.hmacValide(rawBody, this.lire(headers, 'x-fedapay-signature'), credentials?.webhook_secret ?? this.config.get<string>('FEDAPAY_WEBHOOK_SECRET'));
  }

  parserWebhook(payload: unknown) {
    return this.evenementGenerique(payload);
  }

  async verifierStatut(referencePrestataire: string, credentials?: Record<string, string>) {
    const baseUrl = this.config.get<string>('FEDAPAY_API_BASE_URL') ?? 'https://api.fedapay.com/v1';
    const reponse = await this.getJson(`${baseUrl}/transactions/${referencePrestataire}`, {
      Authorization: `Bearer ${credentials?.secret_key ?? this.config.get<string>('FEDAPAY_SECRET_KEY') ?? ''}`,
    });
    const data = reponse?.transaction ?? reponse?.data ?? reponse;
    return { statut: this.statutDepuis(data?.status), montant: Number(data?.amount ?? 0), devise: data?.currency?.iso ?? data?.currency ?? 'XOF' };
  }
}
