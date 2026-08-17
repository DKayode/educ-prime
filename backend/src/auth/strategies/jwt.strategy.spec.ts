import { UnauthorizedException } from '@nestjs/common';
import { RoleType } from '../../utilisateurs/entities/utilisateur.entity';
import { AuthService } from '../auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const createStrategy = (options?: { blacklisted?: boolean; currentVersion?: boolean }) => {
    const authService = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(options?.blacklisted ?? false),
      isAccessTokenVersionCurrent: jest.fn().mockResolvedValue(options?.currentVersion ?? true),
    } as unknown as jest.Mocked<Pick<AuthService, 'isTokenBlacklisted' | 'isAccessTokenVersionCurrent'>>;

    return {
      strategy: new JwtStrategy(authService as unknown as AuthService),
      authService,
    };
  };

  const req = { headers: { authorization: 'Bearer access-token' } };
  const payload = {
    sub: 42,
    email: 'admin@example.com',
    role: RoleType.ADMIN,
    tokenVersion: 3,
  };

  it('returns the authenticated user when token is not blacklisted and version is current', async () => {
    const { strategy, authService } = createStrategy();

    await expect(strategy.validate(req, payload)).resolves.toEqual({
      utilisateurId: 42,
      email: 'admin@example.com',
      role: RoleType.ADMIN,
      tokenVersion: 3,
    });

    expect(authService.isTokenBlacklisted).toHaveBeenCalledWith('access-token');
    expect(authService.isAccessTokenVersionCurrent).toHaveBeenCalledWith(42, 3);
  });

  it('rejects a blacklisted token before checking token version', async () => {
    const { strategy, authService } = createStrategy({ blacklisted: true });

    await expect(strategy.validate(req, payload)).rejects.toThrow(UnauthorizedException);
    expect(authService.isAccessTokenVersionCurrent).not.toHaveBeenCalled();
  });

  it('rejects a token with an outdated version', async () => {
    const { strategy } = createStrategy({ currentVersion: false });

    await expect(strategy.validate(req, payload)).rejects.toThrow(UnauthorizedException);
  });

  it('treats legacy tokens without tokenVersion as version zero', async () => {
    const { strategy, authService } = createStrategy();
    const legacyPayload = { sub: 7, email: 'user@example.com', role: RoleType.ETUDIANT };

    await strategy.validate(req, legacyPayload);

    expect(authService.isAccessTokenVersionCurrent).toHaveBeenCalledWith(7, 0);
  });
});