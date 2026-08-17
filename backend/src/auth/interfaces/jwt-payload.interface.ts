import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: RoleType;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}