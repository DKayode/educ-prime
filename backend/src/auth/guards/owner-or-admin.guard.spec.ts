import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OwnerOrAdminGuard } from './owner-or-admin.guard';

const createContext = (params: Record<string, string>, user?: { utilisateurId: number; role: string }): ExecutionContext =>
  ({
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({ params, user })),
    })),
  }) as unknown as ExecutionContext;

describe('OwnerOrAdminGuard', () => {
  const guard = new OwnerOrAdminGuard();

  it('allows admin users for any resource id', () => {
    expect(guard.canActivate(createContext({ id: '12' }, { utilisateurId: 1, role: 'admin' }))).toBe(true);
  });

  it('allows users to access their own :id resource', () => {
    expect(guard.canActivate(createContext({ id: '7' }, { utilisateurId: 7, role: 'etudiant' }))).toBe(true);
  });

  it('allows users to access their own :userId resource', () => {
    expect(guard.canActivate(createContext({ userId: '7' }, { utilisateurId: 7, role: 'etudiant' }))).toBe(true);
  });

  it('denies users accessing another user resource', () => {
    expect(() => guard.canActivate(createContext({ userId: '8' }, { utilisateurId: 7, role: 'etudiant' }))).toThrow(ForbiddenException);
  });
});
