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
import { MailService } from '../mail/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepository: Repository<BlacklistedToken>,
    private readonly mailService: MailService
  ) { }

  async register(registerDto: RegisterDto): Promise<Utilisateur> {
    this.logger.log(`Tentative d'inscription via /auth/register pour: ${registerDto.email}`);
    const hashedPassword = await bcrypt.hash(registerDto.mot_de_passe, 10);
    const user = await this.utilisateursService.inscription({
      nom: registerDto.nom,
      prenom: registerDto.prenom,
      email: registerDto.email,
      pseudo: registerDto.pseudo,
      mot_de_passe: hashedPassword, // Note: InscriptionDto expects plain password, but we hash here? check service
      role: registerDto.role,
      sexe: registerDto.sexe,
      code_parrainage: registerDto.code_parrainage
    });
    this.logger.log(`Inscription réussie via /auth/register: ${user.email} (ID: ${user.id})`);
    return user;
  }

  async login(loginDto: LoginDto, appareil?: AppareilType): Promise<{ access_token: string; refresh_token: string }> {
    const identifier = loginDto.identifiant || loginDto.email;
    if (!identifier) {
      throw new UnauthorizedException('Identifiant (email ou pseudo) requis');
    }

    this.logger.log(`Tentative de connexion pour: ${identifier}`);
    const user = await this.utilisateursService.findByIdentifier(identifier);
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
    expirationDate.setDate(expirationDate.getDate() + 3); // 3 days

    // Save to database
    const refreshToken = this.refreshTokenRepository.create({
      utilisateur_id: userId,
      token: hashedToken,
      date_expiration: expirationDate,
      appareil,
    });

    const savedToken = await this.refreshTokenRepository.save(refreshToken);
    this.logger.log(`Refresh token créé pour utilisateur ID: ${userId}, appareil: ${appareil}`);

    // Return the composite token (id:token)
    return `${savedToken.id}:${token}`;
  }

  async refreshAccessToken(refreshTokenString: string): Promise<{ access_token: string }> {
    this.logger.log('Tentative de rafraîchissement du token');

    // Expected format: "id:token"
    if (!refreshTokenString || !refreshTokenString.includes(':')) {
      // Fail Fast: Legacy tokens or invalid formats are rejected immediately
      this.logger.warn('Format de token invalide ou ancien token détecté (Fail Fast)');
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    const [idStr, plainTextToken] = refreshTokenString.split(':');
    const tokenId = parseInt(idStr, 10);

    if (isNaN(tokenId)) {
      throw new UnauthorizedException('Token ID invalide');
    }

    // FAST LOOKUP: Find specific token by ID (O(1))
    const validToken = await this.refreshTokenRepository.findOne({ where: { id: tokenId } });

    if (!validToken) {
      this.logger.warn(`Refresh token ID ${tokenId} introuvable`);
      throw new UnauthorizedException('Refresh token invalide');
    }

    // Verify hash
    const isValid = await bcrypt.compare(plainTextToken, validToken.token);
    if (!isValid) {
      this.logger.warn(`Signature invalide pour le refresh token ID ${tokenId}`);
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.utilisateursService.findByEmail(email);
    if (!user) {
      // Pour des raisons de sécurité, ne pas dire si l'email n'existe pas
      // Mais pour le debug c'est utile. En prod, on loggerait juste.
      this.logger.warn(`Demande de mot de passe oublié pour email inconnu: ${email}`);
      return;
    }

    // Générer un code (6 chiffres)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Définir l'expiration (15 minutes)
    const expiration = new Date();
    expiration.setTime(expiration.getTime() + 15 * 60 * 1000);

    // Sauvegarder dans Utilisateur
    await this.utilisateursService.setResetCode(email, code, expiration);

    // Envoyer l'email
    await this.mailService.sendResetCode(email, code);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { email, code, nouveau_mot_de_passe } = resetPasswordDto;

    const user = await this.utilisateursService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Code invalide ou expiré');
    }

    if (user.code_reinitialisation !== code) {
      throw new UnauthorizedException('Code incorrect');
    }

    if (new Date() > user.date_expiration_code) {
      throw new UnauthorizedException('Code expiré');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(nouveau_mot_de_passe, 10);

    // Mettre à jour et nettoyer le code
    await this.utilisateursService.updatePassword(user.id, hashedPassword);

    this.logger.log(`Mot de passe réinitialisé pour ${email}`);
  }
}