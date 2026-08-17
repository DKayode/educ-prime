import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';

describe('RolesGuard', () => {
  const createContext = (role?: RoleType): ExecutionContext =>
    ({
      getHandler: jest.fn(() => 'handler'),
      getClass: jest.fn(() => 'class'),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({
          user: role ? { role } : undefined,
        })),
      })),
    }) as unknown as ExecutionContext;

  const createGuard = (requiredRoles?: RoleType[]) => {
    const reflector = {
      getAllAndOverride: jest.fn(() => requiredRoles),
    } as unknown as Reflector;

    return {
      guard: new RolesGuard(reflector),
      reflector,
    };
  };

  it('allows access when no role metadata is defined', () => {
    const { guard } = createGuard(undefined);

    expect(guard.canActivate(createContext(RoleType.ETUDIANT))).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    const { guard } = createGuard([RoleType.ADMIN]);

    expect(guard.canActivate(createContext(RoleType.ADMIN))).toBe(true);
  });

  it('denies access when the user does not have a required role', () => {
    const { guard } = createGuard([RoleType.ADMIN]);

    expect(() => guard.canActivate(createContext(RoleType.ETUDIANT))).toThrow(ForbiddenException);
  });

  it('asks Reflector to resolve method and class metadata', () => {
    const { guard, reflector } = createGuard([RoleType.ADMIN]);
    const context = createContext(RoleType.ADMIN);

    guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('denies access when role metadata exists but the request has no user', () => {
    const { guard } = createGuard([RoleType.ADMIN]);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });
});