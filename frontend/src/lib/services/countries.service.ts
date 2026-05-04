import { api } from '../api';

export interface CountrySummary {
  country: string;
  logo: string | null;
}

export const countriesService = {
  async list(): Promise<CountrySummary[]> {
    const response = await api.get<{ countries: CountrySummary[] }>('/countries');
    return response.countries;
  },
};
