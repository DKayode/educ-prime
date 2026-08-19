import { api } from '../api';

// Mirrors the backend GET /submissions/stats payload. Country is auto-appended
// by the api client (withCountryQuery) — don't add pays here.
export interface SubmissionStatusCounts {
  total: number;
  pending_approval: number;
  approved: number;
  declined: number;
  a_completer: number;      // demandes en attente à rattacher (parent proposé)
  approval_rate: number;    // approved / (approved + declined) ; 0 si rien de traité
}

export interface SubmissionStatsSeriesPoint {
  date: string;             // 'YYYY-MM-DD' — début du bucket
  epreuves: number;
  concours: number;
  examens_nationaux: number;
}

export interface SubmissionStatsResponse {
  pays: string;
  periode: { startDate: string | null; endDate: string | null };
  epreuves: SubmissionStatusCounts;
  concours: SubmissionStatusCounts;
  examens_nationaux: SubmissionStatusCounts;
  combined: SubmissionStatusCounts;
  granularity: 'day' | 'week' | 'month';
  series: SubmissionStatsSeriesPoint[];
}

export const submissionStatsService = {
  async getStats(startDate: string, endDate: string): Promise<SubmissionStatsResponse> {
    return api.get<SubmissionStatsResponse>(
      `/submissions/stats?startDate=${startDate}&endDate=${endDate}`,
    );
  },
};
