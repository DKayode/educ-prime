import { api } from '../api';

export interface DashboardStats {
  usersCount: number;
  etablissementsCount: number;
  filieresCount: number;
  matieresCount: number;
  niveauEtudeCount: number;
  epreuvesCount: number;
  publicitesCount: number;
  evenementsCount: number;
  opportunitesCount: number;
  concoursCount: number;
  contactsProfessionnelsCount: number;
  parcoursCount: number;
  categoriesCount?: number;
}

export const statsService = {
  // `allCountries` drops the ?country= param so /stats aggregates across every
  // configured country; otherwise the stats are scoped to the selected country.
  async getDashboardStats(allCountries = false): Promise<DashboardStats> {
    const stats = await api.get<DashboardStats>('/stats', { skipCountry: allCountries });

    return stats;
  },
};
