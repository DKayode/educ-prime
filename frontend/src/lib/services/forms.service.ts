import { api } from '../api';
import type { PaginationResponse, PaginationParams } from '../types/pagination';
import { buildPaginationQuery } from '../types/pagination';

export type CampaignStatut = 'draft' | 'active' | 'archived';
export type QuestionType = 'rating' | 'text';

export interface FormQuestion {
  uuid: string;
  libelle: string;
  type: QuestionType;
  ordre: number;
}

export interface FormSection {
  uuid: string;
  titre: string;
  icone?: string | null;
  ordre: number;
  questions: FormQuestion[];
}

export interface FormCampaign {
  uuid: string;
  titre: string;
  description?: string | null;
  statut: CampaignStatut;
  trigger_type: string;
  date_debut?: string | null;
  date_fin?: string | null;
  pays?: string;
  created_by?: number | null;
  date_creation: string;
}

export interface FormCampaignTree extends FormCampaign {
  sections: FormSection[];
}

export interface FormCampaignListItem extends FormCampaign {
  nb_reponses: number;
}

// ── Builder payload (what the admin sends on save) ──
export interface QuestionInput {
  libelle: string;
  type: QuestionType;
  ordre?: number;
}
export interface SectionInput {
  titre: string;
  icone?: string;
  ordre?: number;
  questions: QuestionInput[];
}
export interface CampaignInput {
  titre: string;
  description?: string;
  trigger_type?: string;
  sections: SectionInput[];
}

// ── Results / KPI ──
export interface RatingQuestionResult {
  uuid: string;
  libelle: string;
  section_titre: string | null;
  distribution: Record<1 | 2 | 3 | 4, number>;
  total_reponses: number;
  moyenne: number | null;
}
export interface TextQuestionResult {
  uuid: string;
  libelle: string;
  section_titre: string;
  reponses: { texte: string; submitted_at: string }[];
}
export interface CampaignResults {
  campaign: FormCampaign;
  total_reponses: number;
  rating_questions: RatingQuestionResult[];
  text_questions: TextQuestionResult[];
  reponses_par_jour: { jour: string; count: number }[];
}

// The 4-point satisfaction scale — emoji/label mapping is frontend-only
// (backend stores the smallint 1..4). Ordered best → worst for display.
export const RATING_SCALE: { value: 1 | 2 | 3 | 4; emoji: string; label: string }[] = [
  { value: 4, emoji: '😍', label: 'Top' },
  { value: 3, emoji: '🙂', label: 'Utile' },
  { value: 2, emoji: '😐', label: 'Moyen' },
  { value: 1, emoji: '😞', label: 'Pas utile' },
];

export const STATUT_LABEL: Record<CampaignStatut, string> = {
  draft: 'Brouillon',
  active: 'Active',
  archived: 'Archivée',
};

export const formsService = {
  async getAll(
    params?: PaginationParams & { statut?: CampaignStatut; search?: string },
  ): Promise<PaginationResponse<FormCampaignListItem>> {
    return api.get<PaginationResponse<FormCampaignListItem>>(
      `/forms${buildPaginationQuery(params)}`,
    );
  },

  async getById(uuid: string): Promise<FormCampaignTree> {
    return api.get<FormCampaignTree>(`/forms/${uuid}`);
  },

  async getResults(uuid: string): Promise<CampaignResults> {
    return api.get<CampaignResults>(`/forms/${uuid}/results`);
  },

  async create(data: CampaignInput): Promise<FormCampaignTree> {
    return api.post<FormCampaignTree>('/forms', data);
  },

  async update(uuid: string, data: CampaignInput): Promise<FormCampaignTree> {
    return api.put<FormCampaignTree>(`/forms/${uuid}`, data);
  },

  // Metadata-only edit (titre/description) — allowed even after responses exist.
  async updateMeta(
    uuid: string,
    data: { titre?: string; description?: string },
  ): Promise<FormCampaign> {
    return api.patch<FormCampaign>(`/forms/${uuid}`, data);
  },

  async updateStatut(uuid: string, statut: CampaignStatut): Promise<FormCampaign> {
    return api.patch<FormCampaign>(`/forms/${uuid}/statut`, { statut });
  },

  async delete(uuid: string): Promise<{ message: string }> {
    const country = api.getCountry();
    return api.delete(`/forms/${uuid}?country=${encodeURIComponent(country)}`);
  },
};
