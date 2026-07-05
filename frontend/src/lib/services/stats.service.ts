import { api } from '../api';

export interface DashboardStats {
  usersCount: number;
  etablissementsCount: number;
  filieresCount: number;
  matieresCount: number;
  epreuvesCount: number;
  publicitesCount: number;
  evenementsCount: number;
  opportunitesCount: number;
  concoursCount: number;
  contactsProfessionnelsCount: number;
  parcoursCount: number;
  categoriesCount?: number;
  // Present only when aggregating across all countries: per-country splits.
  par_pays?: CountryStats[];
}

export interface CountryStats extends DashboardStats {
  pays: string;
}

export const statsService = {
  // `allCountries` drops the ?country= param so /stats aggregates across every
  // configured country (and returns a par_pays breakdown); otherwise the stats
  // are scoped to the currently selected country.
  async getDashboardStats(allCountries = false): Promise<DashboardStats> {
    const stats = await api.get<DashboardStats>('/stats', { skipCountry: allCountries });

    return stats;
  },
};
