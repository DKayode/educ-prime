import { api } from '../api';
import type { PaginationResponse } from '../types/pagination';

export type TypeCode = 'PARRAINAGE' | 'AMBASSADEUR' | 'REDUCTION';
export type TypeRemise = 'POURCENTAGE' | 'MONTANT_FIXE';

export interface ProprietaireCode {
  id: number;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
}

export interface Code {
  id: number;
  uuid: string;
  pays: string;
  code: string;
  type: TypeCode;
  proprietaire_id?: number | null;
  proprietaire?: ProprietaireCode | null;
  libelle?: string | null;
  remise_type?: TypeRemise | null;
  remise_valeur?: number | null;
  /** `null` = illimité. */
  usage_max_total?: number | null;
  usage_max_par_utilisateur: number;
  usage_actuel: number;
  date_debut?: string | null;
  date_fin?: string | null;
  plans_eligibles?: number[] | null;
  est_actif: boolean;
  campagne?: { uuid: string; nom: string } | null;
  date_creation: string;
}

export interface CodePayload {
  code: string;
  type: TypeCode;
  proprietaire_id?: number;
  libelle?: string;
  remise_type?: TypeRemise;
  remise_valeur?: number;
  usage_max_total?: number;
  usage_max_par_utilisateur?: number;
  date_debut?: string;
  date_fin?: string;
  est_actif?: boolean;
}

export interface Campagne {
  id: number;
  uuid: string;
  nom: string;
  description?: string | null;
  prefixe?: string | null;
  nombre_codes: number;
  remise_type?: TypeRemise | null;
  remise_valeur?: number | null;
  date_fin?: string | null;
  date_creation: string;
  codes_generes: number;
  codes_utilises: number;
}

export interface CampagnePayload {
  nom: string;
  description?: string;
  nombre_codes: number;
  prefixe?: string;
  remise_type?: TypeRemise;
  remise_valeur?: number;
  date_debut?: string;
  date_fin?: string;
}

export interface UtilisationCode {
  id: number;
  montant_remise: number;
  date_creation: string;
  utilisateur_uuid: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  abonnement_uuid?: string | null;
  statut?: string | null;
}

const query = (params?: Record<string, unknown>) => {
  if (!params) return '';
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

export const codesService = {
  async getAll(params?: {
    page?: number; limit?: number; type?: TypeCode; est_actif?: boolean; search?: string; campagne_uuid?: string;
  }): Promise<PaginationResponse<Code>> {
    return api.get<PaginationResponse<Code>>(`/admin/codes${query(params)}`);
  },

  async create(data: CodePayload): Promise<Code> {
    return api.post<Code>('/admin/codes', data);
  },

  async update(uuid: string, data: Partial<CodePayload>): Promise<Code> {
    return api.put<Code>(`/admin/codes/${uuid}`, data);
  },

  /** Désactivation logique : l'historique d'un code utilisé est conservé. */
  async desactiver(uuid: string): Promise<Code> {
    return api.delete<Code>(`/admin/codes/${uuid}`);
  },

  async getUtilisations(uuid: string): Promise<UtilisationCode[]> {
    return api.get<UtilisationCode[]>(`/admin/codes/${uuid}/utilisations`);
  },

  async getCampagnes(): Promise<Campagne[]> {
    return api.get<Campagne[]>('/admin/codes/campagnes/liste');
  },

  async genererCampagne(data: CampagnePayload): Promise<{ campagne: Campagne; codes_generes: number; demandes: number }> {
    return api.post('/admin/codes/campagnes', data);
  },

  /** L'export est un CSV brut, pas du JSON — l'API client attend du JSON. */
  urlExport(uuid: string): string {
    const base = (import.meta as any).env?.VITE_API_URL || '/backend';
    const pays = localStorage.getItem('country') || 'benin';
    return `${base}/admin/codes/campagnes/${uuid}/export?country=${pays}`;
  },
};

/** Libellé lisible d'une remise, ou « aucune » pour un code de parrainage. */
export const libelleRemise = (c: { remise_type?: TypeRemise | null; remise_valeur?: number | null }): string => {
  if (!c.remise_type || c.remise_valeur == null) return '—';
  return c.remise_type === 'POURCENTAGE'
    ? `${c.remise_valeur} %`
    : `${Number(c.remise_valeur).toLocaleString('fr-FR')} XOF`;
};

/** `usage_max_total` à `null` veut dire illimité, pas zéro. */
export const libelleUsage = (c: Code): string =>
  c.usage_max_total == null ? `${c.usage_actuel} / ∞` : `${c.usage_actuel} / ${c.usage_max_total}`;
