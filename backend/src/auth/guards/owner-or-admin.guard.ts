import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = Number(request.params.id ?? request.params.userId);

    if (user?.role === 'admin') {
      return true;
    }

    if (Number.isFinite(resourceId) && user?.utilisateurId === resourceId) {
      return true;
    }

    throw new ForbiddenException("Vous n'avez pas la permission d'acceder a cette ressource");
  }
}
