import { MethodePaiement, PrestatairePaiement, StatutPaiement } from './paiement.enums';

export interface InitierPaiementCommande {
  reference: string;
  montant: number;
  devise: string;
  client: { nom: string; email: string; telephone?: string };
  urlRetour: string;
  urlWebhook: string;
  metadata?: Record<string, unknown>;
}

export interface ResultatInitiationPaiement {
  referencePrestataire: string;
  urlPaiement?: string;
  tokenClient?: string;
  payload?: unknown;
}

export interface EvenementPaiementParse {
  evenementId: string;
  referencePrestataire?: string;
  reference: string;
  statut: StatutPaiement;
  montant: number;
  devise: string;
  methode?: MethodePaiement;
}

export interface PaiementProviderPort {
  readonly code: PrestatairePaiement;
  initier(cmd: InitierPaiementCommande): Promise<ResultatInitiationPaiement>;
  verifierSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): boolean;
  parserWebhook(payload: unknown): EvenementPaiementParse;
  verifierStatut(referencePrestataire: string): Promise<{ statut: StatutPaiement; montant: number; devise?: string }>;
}
