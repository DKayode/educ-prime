import { api } from '../api';
import type { PaginationResponse } from '../types/pagination';

export interface SubmissionParentRef {
  id: number;
  nom: string;
}

export interface SubmissionUploader {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

// Shape returned by the backend toSubmissionResponse (GET /epreuves/submissions).
export interface EpreuveSubmission {
  id: number;
  uuid: string;
  pays: string;
  titre: string;
  annee?: number | null;
  section: string;
  status: string;
  date_creation: string;
  file_path: string;
  file_extension: string;
  url: string;
  soumis_par?: SubmissionUploader | null;
  etablissement?: SubmissionParentRef | null;
  proposed_etablissement?: string | null;
  filiere?: SubmissionParentRef | null;
  proposed_filiere?: string | null;
  niveau_etude?: SubmissionParentRef | null;
  proposed_niveau?: string | null;
  matiere?: SubmissionParentRef | null;
  proposed_matiere?: string | null;
  missing: {
    etablissement: boolean;
    filiere: boolean;
    niveau_etude: boolean;
    matiere: boolean;
  };
}

export interface ResolveSubmissionData {
  etablissement_id?: number;
  filiere_id?: number;
  niveau_etude_id?: number;
  matiere_id?: number;
  annee?: number;
  section?: 'normal' | 'rattrapage';
}

export const epreuveSubmissionsService = {
  // Admin list. country is appended by the api GET layer.
  async list(params?: { status?: string; page?: number; limit?: number }): Promise<PaginationResponse<EpreuveSubmission>> {
    const qp = new URLSearchParams();
    if (params?.status) qp.append('status', params.status);
    if (params?.page) qp.append('page', params.page.toString());
    if (params?.limit) qp.append('limit', params.limit.toString());
    const qs = qp.toString() ? `?${qp.toString()}` : '';
    return api.get<PaginationResponse<EpreuveSubmission>>(`/epreuves/submissions${qs}`);
  },

  // Resolution: attach real parent ids. JSON write → api layer injects pays.
  async resolve(id: number, data: ResolveSubmissionData): Promise<EpreuveSubmission> {
    return api.patch<EpreuveSubmission>(`/epreuves/submissions/${id}`, data);
  },

  // Approve → creates the real épreuve + emails uploader.
  async approve(id: number): Promise<{ submission: EpreuveSubmission; epreuve: { id: number } }> {
    return api.patch(`/epreuves/submissions/${id}/approve`, {});
  },

  // Decline → marks declined + emails uploader. Optional reason.
  async decline(id: number, reason?: string): Promise<EpreuveSubmission> {
    return api.patch<EpreuveSubmission>(`/epreuves/submissions/${id}/decline`, reason ? { reason } : {});
  },
};
