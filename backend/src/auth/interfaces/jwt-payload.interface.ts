import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: RoleType;
  iat?: number;
  exp?: number;
}