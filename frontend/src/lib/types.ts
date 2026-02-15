// Type definitions for API entities

export interface Etablissement {
  id: number;
  nom: string;
  ville?: string;
  code_postal?: string;
  logo?: string;
}

export interface Filiere {
  id: number;
  nom: string;
  etablissement?: Etablissement;
}

export interface NiveauEtude {
  id: number;
  nom: string;
  duree_mois?: number;
  filiere?: Filiere;
}

export interface Matiere {
  id: number;
  nom: string;
  description?: string;
  niveau_etude?: NiveauEtude;
  filiere?: Filiere;
}

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  pseudo?: string;
  email: string;
  photo?: string;
  etablissement?: Etablissement;
  filiere?: Filiere;
  niveau_etude?: NiveauEtude;
  sexe?: 'M' | 'F' | 'Autre';
  telephone?: string;
  role: 'admin' | 'étudiant' | 'professeur' | 'autre';
  est_desactive?: boolean;
  date_suppression_prevue?: string;
  date_creation?: string;
  mon_code_parrainage?: string;
  filleulsCount?: number;
}

export type EpreuveType = 'Interrogation' | 'Devoirs' | 'Concours' | 'Examens';

export interface Epreuve {
  id: number;
  titre: string;
  url: string;
  professeur?: Utilisateur;
  matiere?: Matiere;
  duree_minutes: number;
  date_creation: string;
  date_publication?: string;
  nombre_pages?: number;
  nombre_telechargements?: number;
  type?: EpreuveType;
}

export interface Ressource {
  id: number;
  titre: string;
  type: 'Quiz' | 'Exercices' | 'Document';
  url: string;
  professeur?: Utilisateur;
  matiere?: Matiere;
  date_creation: string;
  date_publication?: string;
  nombre_pages?: number;
  nombre_telechargements?: number;
}

export interface LoginCredentials {
  email: string;
  mot_de_passe: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  utilisateur?: Utilisateur;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface Forum {
  id: number;
  theme: string;
  content: string;
  photo?: string;

  user_id: number;
  user?: Utilisateur;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  nb_like?: number;
  nb_comment?: number;
  is_like?: boolean;
}

export interface ForumCommentaire {
  id: number;
  commentable_id: string; // BigInt from backend
  commentable_type: string;
  commentaire_id?: number;
  content: string;
  user_id: number;
  user?: Utilisateur;
  created_at: string;
  children?: ForumCommentaire[];

  nb_like?: number;
  is_like?: boolean;
  // deprecated
  forum_id?: number;
}

export interface CreateForumCommentaire {
  forum_id: number; // Used to identify target in service
  content: string;
  commentaire_id?: number;

}
