import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService
  ) {}

  async register(registerDto: RegisterDto): Promise<Utilisateur> {
    const hashedPassword = await bcrypt.hash(registerDto.mot_de_passe, 10);
    const user = await this.utilisateursService.inscription({
      nom: registerDto.nom,
      prenom: registerDto.prenom,
      email: registerDto.email,
      mot_de_passe: hashedPassword,
      role: registerDto.role,
      sexe: registerDto.sexe
    });
    return user;
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string }> {
    const user = await this.utilisateursService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    
    const isPasswordValid = await bcrypt.compare(loginDto.mot_de_passe, user.mot_de_passe);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(userId: number): Promise<Utilisateur> {
    return this.utilisateursService.findOne(userId.toString());
  }
}