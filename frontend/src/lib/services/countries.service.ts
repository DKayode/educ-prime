import { api } from '../api';

export const countriesService = {
  async list(): Promise<string[]> {
    const response = await api.get<{ countries: string[] }>('/countries');
    return response.countries;
  },
};
