import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateursService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateursRepository: Repository<Utilisateur>,
  ) {}

  async findByEmail(email: string) {
    return this.utilisateursRepository.findOne({
      where: { email }
    });
  }

  async inscription(inscriptionDto: InscriptionDto) {
    // Check if email already exists
    const existingUser = await this.utilisateursRepository.findOne({
      where: { email: inscriptionDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Note: Password should already be hashed by AuthService before calling this method
    // Create new user
    const newUser = this.utilisateursRepository.create(inscriptionDto);

    // Save user
    const savedUser = await this.utilisateursRepository.save(newUser);
    
    // Remove password from response
    delete savedUser.mot_de_passe;
    return savedUser;
  }

  async findAll() {
    const users = await this.utilisateursRepository.find({
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'photo', 'sexe', 'telephone', 'role'],
      relations: ['etablissement', 'filiere', 'niveau_etude'],
    });
    return users;
  }

  async findOne(id: string) {
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'photo', 'sexe', 'telephone', 'role'],
      relations: ['etablissement', 'filiere', 'niveau_etude'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async update(id: string, majUtilisateurDto: MajUtilisateurDto) {
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Update user
    Object.assign(user, majUtilisateurDto);
    const updatedUser = await this.utilisateursRepository.save(user);
    
    // Remove password from response
    delete updatedUser.mot_de_passe;
    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.utilisateursRepository.remove(user);
    return { message: 'Utilisateur supprimé avec succès' };
  }
}