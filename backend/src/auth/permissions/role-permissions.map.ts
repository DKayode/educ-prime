import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';
import { Permission } from './permission.enum';

export const ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  [RoleType.ADMIN]: Object.values(Permission),
  [RoleType.PROFESSEUR]: [
    Permission.EPREUVES_READ,
    Permission.EPREUVES_CREATE,
    Permission.EPREUVES_UPDATE,
    Permission.EXAMENS_NATIONAUX_READ,
    Permission.CONCOURS_READ,
    Permission.REFERENTIALS_READ,
  ],
  [RoleType.ETUDIANT]: [
    Permission.EPREUVES_READ,
    Permission.EXAMENS_NATIONAUX_READ,
    Permission.CONCOURS_READ,
    Permission.REFERENTIALS_READ,
  ],
  [RoleType.AUTRE]: [],
};