import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { RefreshToken, AppareilType } from './entities/refresh-token.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepository: Repository<BlacklistedToken>
  ) { }

  async register(registerDto: RegisterDto): Promise<Utilisateur> {
    this.logger.log(`Tentative d'inscription via /auth/register pour: ${registerDto.email}`);
    const hashedPassword = await bcrypt.hash(registerDto.mot_de_passe, 10);
    const user = await this.utilisateursService.inscription({
      nom: registerDto.nom,
      prenom: registerDto.prenom,
      email: registerDto.email,
      mot_de_passe: hashedPassword,
      role: registerDto.role,
      sexe: registerDto.sexe
    });
    this.logger.log(`Inscription réussie via /auth/register: ${user.email} (ID: ${user.id})`);
    return user;
  }

  async login(loginDto: LoginDto, appareil?: AppareilType): Promise<{ access_token: string; refresh_token: string }> {
    this.logger.log(`Tentative de connexion pour: ${loginDto.email}`);
    const user = await this.utilisateursService.findByEmail(loginDto.email);
    if (!user) {
      this.logger.warn(`Échec de connexion: utilisateur ${loginDto.email} introuvable`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.est_desactive) {
      this.logger.warn(`Connexion refusée: compte désactivé pour ${loginDto.email}`);
      throw new UnauthorizedException('Ce compte a été désactivé.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.mot_de_passe, user.mot_de_passe);
    if (!isPasswordValid) {
      this.logger.warn(`Échec de connexion: mot de passe invalide pour ${loginDto.email}`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Generate access token (12h)
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token (7 days)
    const refreshToken = await this.createRefreshToken(user.id, appareil || AppareilType.WEB);

    this.logger.log(`Connexion réussie: ${user.email} (ID: ${user.id}, Rôle: ${user.role})`);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async createRefreshToken(userId: number, appareil: AppareilType): Promise<string> {
    this.logger.log(`Création d'un refresh token pour utilisateur ID: ${userId}`);

    // Remove old refresh tokens for this user and device
    await this.refreshTokenRepository.delete({ utilisateur_id: userId, appareil });

    // Generate a random token
    const token = crypto.randomBytes(64).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    // Calculate expiration (7 days)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days

    // Save to database
    const refreshToken = this.refreshTokenRepository.create({
      utilisateur_id: userId,
      token: hashedToken,
      date_expiration: expirationDate,
      appareil,
    });

    await this.refreshTokenRepository.save(refreshToken);
    this.logger.log(`Refresh token créé pour utilisateur ID: ${userId}, appareil: ${appareil}`);

    return token; // Return the plain token to the client
  }

  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
    this.logger.log('Tentative de rafraîchissement du token');

    // Find all refresh tokens and check against the provided token
    const allTokens = await this.refreshTokenRepository.find();
    let validToken: RefreshToken | null = null;

    for (const dbToken of allTokens) {
      const isValid = await bcrypt.compare(refreshToken, dbToken.token);
      if (isValid) {
        validToken = dbToken;
        break;
      }
    }

    if (!validToken) {
      this.logger.warn('Refresh token invalide');
      throw new UnauthorizedException('Refresh token invalide');
    }

    // Check if token is expired
    if (new Date() > validToken.date_expiration) {
      this.logger.warn(`Refresh token expiré pour utilisateur ID: ${validToken.utilisateur_id}`);
      await this.refreshTokenRepository.delete({ id: validToken.id });
      throw new UnauthorizedException('Refresh token expiré, veuillez vous reconnecter');
    }

    // Get user details
    const user = await this.utilisateursService.findOne(validToken.utilisateur_id.toString());
    if (!user) {
      this.logger.warn(`Utilisateur ID ${validToken.utilisateur_id} introuvable`);
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Generate new access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Access token rafraîchi pour utilisateur: ${user.email} (ID: ${user.id})`);
    return { access_token: accessToken };
  }

  async revokeRefreshToken(userId: number, appareil?: AppareilType): Promise<void> {
    this.logger.log(`Révocation du refresh token pour utilisateur ID: ${userId}`);

    if (appareil) {
      await this.refreshTokenRepository.delete({ utilisateur_id: userId, appareil });
    } else {
      await this.refreshTokenRepository.delete({ utilisateur_id: userId });
    }

    this.logger.log(`Refresh token(s) révoqué(s) pour utilisateur ID: ${userId}`);
  }

  async blacklistAccessToken(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return;
    }

    const date_expiration = new Date(decoded.exp * 1000);
    const blacklistedToken = this.blacklistedTokenRepository.create({
      token,
      date_expiration,
    });

    await this.blacklistedTokenRepository.save(blacklistedToken);
    this.logger.log(`Access token blacklisté jusqu'à: ${date_expiration}`);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.blacklistedTokenRepository.findOne({ where: { token } });
    return !!blacklisted;
  }

  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('Nettoyage des refresh tokens et tokens blacklistés expirés');

    const refreshResult = await this.refreshTokenRepository.delete({
      date_expiration: LessThan(new Date()),
    });

    const blacklistResult = await this.blacklistedTokenRepository.delete({
      date_expiration: LessThan(new Date()),
    });

    this.logger.log(`${refreshResult.affected || 0} refresh token(s) expiré(s) supprimé(s)`);
    this.logger.log(`${blacklistResult.affected || 0} token(s) blacklisté(s) expiré(s) supprimé(s)`);
  }

  async validateUser(userId: number): Promise<Utilisateur> {
    this.logger.log(`Validation de l'utilisateur ID: ${userId}`);
    return this.utilisateursService.findOne(userId.toString());
  }
}