import { api } from '../api';
import type { Utilisateur } from '../types';
import type { PermissionValue } from '../permissions';

export interface PermissionProfilePermission {
  id: number;
  profileId: number;
  permission: PermissionValue;
  created_at?: string;
}

export interface PermissionProfile {
  id: number;
  code: string;
  label: string;
  description?: string | null;
  is_system: boolean;
  permissions: PermissionProfilePermission[];
  created_at?: string;
  updated_at?: string;
}

export interface EffectiveAuthorization {
  userId: number;
  role: Utilisateur['role'];
  profiles: PermissionProfile[];
  permissions: PermissionValue[];
}

export interface SavePermissionProfilePayload {
  code: string;
  label: string;
  description?: string;
  is_system?: boolean;
  permissions: PermissionValue[];
}

export const authorizationService = {
  listPermissions: () => api.get<PermissionValue[]>('/authorization/permissions'),
  listProfiles: () => api.get<PermissionProfile[]>('/authorization/profiles'),
  getProfile: (id: number) => api.get<PermissionProfile>(`/authorization/profiles/${id}`),
  createProfile: (data: SavePermissionProfilePayload) => api.post<PermissionProfile>('/authorization/profiles', data),
  updateProfile: (id: number, data: Partial<SavePermissionProfilePayload>) => api.patch<PermissionProfile>(`/authorization/profiles/${id}`, data),
  deleteProfile: (id: number) => api.delete<{ deleted: boolean }>(`/authorization/profiles/${id}`),
  assignProfile: (userId: number, profileId: number) => api.post(`/authorization/users/${userId}/profiles`, { profileId }),
  removeProfile: (userId: number, profileId: number) => api.delete<{ removed: boolean }>(`/authorization/users/${userId}/profiles/${profileId}`),
  getUserAuthorization: (userId: number) => api.get<EffectiveAuthorization>(`/authorization/users/${userId}/permissions`),
  getMyAuthorization: () => api.get<EffectiveAuthorization>('/authorization/me/permissions'),
};
