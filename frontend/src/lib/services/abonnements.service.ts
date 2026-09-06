import { api } from '../api';
import type { PaginationParams, PaginationResponse } from '../types/pagination';

export type StatutAbonnement = 'EN_ATTENTE' | 'ACTIF' | 'EXPIRE' | 'ANNULE' | 'REMBOURSE';

export interface PlanAbonnement {
  id: number;
  uuid: string;
  pays: string;
  code: string;
  libelle: string;
  description?: string | null;
  prix: number;
  devise: string;
  duree_jours: number;
  est_actif: boolean;
  ordre_affichage: number;
  date_creation: string;
  date_modification: string;
}

export interface PlanPayload {
  code: string;
  libelle: string;
  description?: string;
  prix: number;
  devise?: string;
  duree_jours: number;
  est_actif?: boolean;
  ordre_affichage?: number;
}

export interface AbonnementUtilisateur {
  id: number;
  uuid?: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
}

export interface Abonnement {
  id: number;
  uuid: string;
  pays: string;
  utilisateur_id: number;
  statut: StatutAbonnement;
  date_debut?: string | null;
  date_fin?: string | null;
  montant_paye: number;
  devise: string;
  metadata?: Record<string, unknown> | null;
  date_creation: string;
  plan?: PlanAbonnement | null;
  utilisateur?: AbonnementUtilisateur | null;
}

export interface AbonnementEvenement {
  id: number;
  type: string;
  payload?: Record<string, unknown> | null;
  date_creation: string;
}

export interface ActivationPayload {
  montant_paye: number;
  reference_paiement?: string;
  commentaire?: string;
}

export type AbonnementFilters = PaginationParams & {
  statut?: StatutAbonnement;
  plan_code?: string;
  search?: string;
};

const query = (params?: Record<string, unknown> | AbonnementFilters) => {
  if (!params) return '';
  const qs = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

export const abonnementsService = {
  // ── Plans ────────────────────────────────────────────────────────────────
  /** Vue admin : inclut les plans fermés, invisibles du catalogue mobile. */
  async getPlans(): Promise<PlanAbonnement[]> {
    return api.get<PlanAbonnement[]>('/admin/abonnements/plans');
  },

  async createPlan(data: PlanPayload): Promise<PlanAbonnement> {
    return api.post<PlanAbonnement>('/admin/abonnements/plans', data);
  },

  async updatePlan(uuid: string, data: Partial<PlanPayload>): Promise<PlanAbonnement> {
    return api.put<PlanAbonnement>(`/admin/abonnements/plans/${uuid}`, data);
  },

  /** Fermeture logique : un plan référencé par un abonnement ne disparaît pas. */
  async fermerPlan(uuid: string): Promise<PlanAbonnement> {
    return api.delete<PlanAbonnement>(`/admin/abonnements/plans/${uuid}`);
  },

  // ── Abonnements ──────────────────────────────────────────────────────────
  async getAbonnements(filters?: AbonnementFilters): Promise<PaginationResponse<Abonnement>> {
    return api.get<PaginationResponse<Abonnement>>(`/admin/abonnements${query(filters)}`);
  },

  async getEvenements(uuid: string): Promise<AbonnementEvenement[]> {
    return api.get<AbonnementEvenement[]>(`/admin/abonnements/${uuid}/evenements`);
  },

  /** Activation d'un abonnement encaissé hors application. */
  async activer(uuid: string, data: ActivationPayload): Promise<Abonnement> {
    return api.post<Abonnement>(`/admin/abonnements/${uuid}/activer`, data);
  },

  async prolonger(uuid: string, jours: number, motif?: string): Promise<Abonnement> {
    return api.post<Abonnement>(`/admin/abonnements/${uuid}/prolonger`, { jours, motif });
  },

  async annuler(uuid: string, motif?: string): Promise<Abonnement> {
    return api.post<Abonnement>(`/admin/abonnements/${uuid}/annuler`, { motif });
  },
};

/**
 * Un abonnement peut être ACTIF en base avec une date de fin dépassée : la
 * bascule vers EXPIRE est écrite par une tâche horaire. Le serveur, lui, refuse
 * déjà l'accès. Afficher « actif » sur le seul statut mentirait à l'admin.
 */
export const estReellementActif = (a: Abonnement): boolean =>
  a.statut === 'ACTIF' && !!a.date_fin && new Date(a.date_fin) > new Date();
