import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from "@/lib/services/auth.service";
import { countriesService } from "@/lib/services/countries.service";
import { api } from "@/lib/api";
import type { Utilisateur } from "@/lib/types";

interface AuthContextType {
  user: Utilisateur | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Bootstrap the country slug BEFORE any other request fires so every
    // subsequent call carries ?country=. Without this seeding, requests sent
    // between mount and the CountrySwitcher's own effect would silently fall
    // back to the backend's default scope.
    const bootstrapCountry = async () => {
      // Already chosen previously? Keep it.
      if (localStorage.getItem('country')) return;
      try {
        const list = await countriesService.list();
        if (list.length > 0) api.setCountry(list[0].country);
      } catch (err) {
        console.error('[Auth] Échec du bootstrap pays:', err);
      }
    };

    const initAuth = async () => {
      console.log('[Auth] Initialisation...');
      await bootstrapCountry();
      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
          console.log('[Auth] ✓ Session restaurée');
        } catch (error) {
          // Token might be expired, clear it
          console.log('[Auth] Session expirée, déconnexion');
          authService.logout();
        }
      } else {
        console.log('[Auth] Aucune session active');
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[Auth] Connexion en cours...');
    try {
      const response = await authService.login({ email, mot_de_passe: password });
      setUser(response.utilisateur || null);
      console.log('[Auth] ✓ Connexion réussie');
    } catch (error) {
      console.error('[Auth] ✗ Échec de la connexion');
      throw error;
    }
  };

  const logout = async () => {
    console.log('[Auth] Déconnexion...');
    await authService.logout();
    setUser(null);
    console.log('[Auth] ✓ Déconnexion réussie');
  };

  const refreshUser = async () => {
    if (authService.isAuthenticated()) {
      const profile = await authService.getProfile();
      setUser(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
