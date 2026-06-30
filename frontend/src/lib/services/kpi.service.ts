import { api } from '../api';

// Mirrors the backend GET /kpi payload (grouped by section). Country is
// auto-appended by the api client (withCountryQuery) — don't add pays here.
export interface KpiResponse {
  pays: string;
  periode: { startDate: string; endDate: string };
  utilisateurs: {
    total: number;              // KPI 2
    age_35_max: number;         // KPI 3
    femmes: number;             // KPI 4
    femmes_35_max: number;      // KPI 5
    zone_rurale: number;        // KPI 6
    situation_handicap: number; // KPI 7
    connectes: number;          // KPI 8
  };
  apprenants: {
    total: number;              // KPI 9
    age_35_max: number;         // KPI 10
    age_35_max_femmes: number;  // KPI 11
    femmes: number;             // KPI 12
    zone_rurale: number;        // KPI 13
    situation_handicap: number; // KPI 14
  };
  engagement: {
    apprenants_connectes: number; // KPI 15
    apprenants_ressource: {       // KPI 16
      semaine: number;
      deux_semaines: number;
      mois: number;
    };
  };
}

export const kpiService = {
  async getKpis(startDate: string, endDate: string): Promise<KpiResponse> {
    return api.get<KpiResponse>(`/kpi?startDate=${startDate}&endDate=${endDate}`);
  },
};
