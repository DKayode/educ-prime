import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // Auth is intentionally cross-country: a single account can switch
    // scope via the country switcher without re-authenticating, so we
    // don't compare the request's country against the token's any more.

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const isBlacklisted = await this.authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token blacklisté/révoqué');
      }
    }
    const isCurrentTokenVersion = await this.authService.isAccessTokenVersionCurrent(
      payload.sub,
      payload.tokenVersion ?? 0,
    );
    if (!isCurrentTokenVersion) {
      throw new UnauthorizedException('Token revoque apres changement de droits');
    }

    return {
      utilisateurId: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0,
    };
  }
}
