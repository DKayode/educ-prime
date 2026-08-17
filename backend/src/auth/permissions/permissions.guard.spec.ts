import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';
import { AuthorizationService } from '../../authorization/authorization.service';
import { Permission } from './permission.enum';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const createContext = (role?: RoleType, utilisateurId = 12): ExecutionContext =>
    ({
      getHandler: jest.fn(() => 'handler'),
      getClass: jest.fn(() => 'class'),
      switchToHttp: jest.fn(() => ({
        getRequest: jest.fn(() => ({
          user: role ? { role, utilisateurId } : undefined,
        })),
      })),
    }) as unknown as ExecutionContext;

  const createGuard = (requiredPermissions?: Permission[], allowed = true) => {
    const reflector = {
      getAllAndOverride: jest.fn(() => requiredPermissions),
    } as unknown as Reflector;
    const authorizationService = {
      userHasPermissions: jest.fn().mockResolvedValue(allowed),
    } as unknown as jest.Mocked<Pick<AuthorizationService, 'userHasPermissions'>>;

    return {
      guard: new PermissionsGuard(reflector, authorizationService as unknown as AuthorizationService),
      reflector,
      authorizationService,
    };
  };

  it('allows access when no permission metadata is defined', async () => {
    const { guard, authorizationService } = createGuard(undefined);

    await expect(guard.canActivate(createContext(RoleType.ETUDIANT))).resolves.toBe(true);
    expect(authorizationService.userHasPermissions).not.toHaveBeenCalled();
  });

  it('delegates permission checks to AuthorizationService', async () => {
    const { guard, authorizationService } = createGuard([Permission.WALLET_WITHDRAWALS_APPROVE]);

    await expect(guard.canActivate(createContext(RoleType.ADMIN, 99))).resolves.toBe(true);
    expect(authorizationService.userHasPermissions).toHaveBeenCalledWith(
      99,
      RoleType.ADMIN,
      [Permission.WALLET_WITHDRAWALS_APPROVE],
    );
  });

  it('denies access when AuthorizationService denies a permission', async () => {
    const { guard } = createGuard([Permission.WALLET_CONFIGURATION_UPDATE], false);

    await expect(guard.canActivate(createContext(RoleType.ETUDIANT))).rejects.toThrow(ForbiddenException);
  });

  it('denies access when a required permission exists but the request has no user role', async () => {
    const { guard } = createGuard([Permission.USERS_READ]);

    await expect(guard.canActivate(createContext())).rejects.toThrow(ForbiddenException);
  });

  it('asks Reflector to resolve method and class permission metadata', async () => {
    const { guard, reflector } = createGuard([Permission.USERS_READ]);
    const context = createContext(RoleType.ADMIN);

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});