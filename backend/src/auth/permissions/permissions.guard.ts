import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../../authorization/authorization.service';
import { Permission } from './permission.enum';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException("Vous n'avez pas les permissions necessaires pour effectuer cette action.");
    }

    const hasAllPermissions = await this.authorizationService.userHasPermissions(
      user.utilisateurId,
      user.role,
      requiredPermissions,
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException("Vous n'avez pas les permissions necessaires pour effectuer cette action.");
    }

    return true;
  }
}