import { api } from '../api';

export interface DashboardStats {
  usersCount: number;
  etablissementsCount: number;
  filieresCount: number;
  matieresCount: number;
  epreuvesCount: number;
  storageUsed: number; // in bytes
}

export const statsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const stats = await api.get<Omit<DashboardStats, 'storageUsed'>>('/stats');
    
    return {
      ...stats,
      storageUsed: 0, // Would need a dedicated endpoint for accurate storage
    };
  },
};
