import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService
  ) {}

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

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    this.logger.log(`Tentative de connexion pour: ${loginDto.email}`);
    const user = await this.utilisateursService.findByEmail(loginDto.email);
    if (!user) {
      this.logger.warn(`Échec de connexion: utilisateur ${loginDto.email} introuvable`);
      throw new UnauthorizedException('Identifiants invalides');
    }
    
    const isPasswordValid = await bcrypt.compare(loginDto.mot_de_passe, user.mot_de_passe);
    if (!isPasswordValid) {
      this.logger.warn(`Échec de connexion: mot de passe invalide pour ${loginDto.email}`);
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    this.logger.log(`Connexion réussie: ${user.email} (ID: ${user.id}, Rôle: ${user.role})`);
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(userId: number): Promise<Utilisateur> {
    this.logger.log(`Validation de l'utilisateur ID: ${userId}`);
    return this.utilisateursService.findOne(userId.toString());
  }
}