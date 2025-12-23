import { api } from '../api';

export interface DashboardStats {
  usersCount: number;
  etablissementsCount: number;
  filieresCount: number;
  matieresCount: number;
  epreuvesCount: number;
  ressourcesCount: number;
  publicitesCount: number;
  evenementsCount: number;
  opportunitesCount: number;
  concoursCount: number;
  contactsProfessionnelsCount: number;
  parcoursCount: number;
}

export const statsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const stats = await api.get<DashboardStats>('/stats');

    return stats;
  },
};
