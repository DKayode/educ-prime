import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authService } from "@/lib/services/auth.service";
import { authorizationService } from "@/lib/services/authorization.service";
import { countriesService } from "@/lib/services/countries.service";
import { api } from "@/lib/api";
import type { PermissionValue } from "@/lib/permissions";
import { hasAllPermissions, hasAnyPermission as checkAnyPermission } from "@/lib/permissions";
import type { Utilisateur } from "@/lib/types";

interface AuthContextType {
  user: Utilisateur | null;
  permissions: PermissionValue[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: PermissionValue | PermissionValue[]) => boolean;
  hasAnyPermission: (permissions: PermissionValue | PermissionValue[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [permissions, setPermissions] = useState<PermissionValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateAuthorization = async (profile: Utilisateur) => {
    try {
      const authorization = await authorizationService.getMyAuthorization();
      const enrichedUser = {
        ...profile,
        permissions: authorization.permissions,
        permissionProfiles: authorization.profiles,
      };
      setUser(enrichedUser);
      setPermissions(authorization.permissions);
      return enrichedUser;
    } catch (error) {
      console.warn('[Auth] Permissions indisponibles, session gardee avec permissions vides', error);
      setUser(profile);
      setPermissions([]);
      return profile;
    }
  };

  useEffect(() => {
    const bootstrapCountry = async () => {
      if (localStorage.getItem('country')) return;
      try {
        const list = await countriesService.list();
        if (list.length > 0) api.setCountry(list[0].country);
      } catch (err) {
        console.error('[Auth] Echec du bootstrap pays:', err);
      }
    };

    const initAuth = async () => {
      console.log('[Auth] Initialisation...');
      await bootstrapCountry();
      if (authService.isAuthenticated()) {
        try {
          const profile = await authService.getProfile();
          await hydrateAuthorization(profile);
          console.log('[Auth] Session restauree');
        } catch (error) {
          console.log('[Auth] Session expiree, deconnexion');
          authService.logout();
          setUser(null);
          setPermissions([]);
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
      if (response.utilisateur) {
        await hydrateAuthorization(response.utilisateur);
      } else {
        setUser(null);
        setPermissions([]);
      }
      console.log('[Auth] Connexion reussie');
    } catch (error) {
      console.error('[Auth] Echec de la connexion');
      throw error;
    }
  };

  const logout = async () => {
    console.log('[Auth] Deconnexion...');
    await authService.logout();
    setUser(null);
    setPermissions([]);
    console.log('[Auth] Deconnexion reussie');
  };

  const refreshUser = async () => {
    if (authService.isAuthenticated()) {
      const profile = await authService.getProfile();
      await hydrateAuthorization(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission: (permission) => hasAllPermissions(permissions, permission),
        hasAnyPermission: (requiredPermissions) => checkAnyPermission(permissions, requiredPermissions),
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
