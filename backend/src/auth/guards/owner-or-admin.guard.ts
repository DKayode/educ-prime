import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = parseInt(request.params.id);

    // Allow if user is admin
    if (user.role === 'admin') {
      return true;
    }

    // Allow if user is accessing their own resource
    if (user.utilisateurId === resourceId) {
      return true;
    }

    throw new ForbiddenException("Vous n'avez pas la permission d'accéder à cette ressource");
  }
}
