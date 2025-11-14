import { SetMetadata } from '@nestjs/common';
import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';

export const Roles = (...roles: RoleType[]) => SetMetadata('roles', roles);