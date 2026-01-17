import { api } from '../api';
import type { LoginCredentials, LoginResponse, Utilisateur } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Login with appareil field as per API spec
      const response = await api.post<{ access_token: string; refresh_token: string }>(
        '/auth/connexion',
        { ...credentials, appareil: 'web' }
      );

      // Store tokens
      api.setToken(response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // Fetch user profile after successful login
      const utilisateur = await authService.getProfile();

      return {
        ...response,
        utilisateur,
      };
    } catch (error) {
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/deconnexion');
    } catch (error) {
      // Server logout failed, clear tokens anyway
    } finally {
      api.clearToken();
    }
  },

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      api.setToken(response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getProfile(): Promise<Utilisateur> {
    try {
      const profile = await api.get<Utilisateur>('/utilisateurs/profil');
      return profile;
    } catch (error) {
      throw error;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(data: { email: string; code: string; nouveau_mot_de_passe: string }): Promise<void> {
    await api.post('/auth/reset-password', data);
  },
};
