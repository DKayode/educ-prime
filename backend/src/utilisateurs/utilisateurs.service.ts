import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilisateursService {
  private readonly logger = new Logger(UtilisateursService.name);

  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateursRepository: Repository<Utilisateur>,
  ) {}

  async findByEmail(email: string) {
    this.logger.log(`Recherche de l'utilisateur par email: ${email}`);
    return this.utilisateursRepository.findOne({
      where: { email }
    });
  }

  async inscription(inscriptionDto: InscriptionDto) {
    this.logger.log(`Tentative d'inscription pour: ${inscriptionDto.email}`);
    
    // Check if email already exists
    const existingUser = await this.utilisateursRepository.findOne({
      where: { email: inscriptionDto.email },
    });

    if (existingUser) {
      this.logger.warn(`Échec de l'inscription: email ${inscriptionDto.email} déjà utilisé`);
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(inscriptionDto.mot_de_passe, 10);
    
    // Create new user with hashed password
    const newUser = this.utilisateursRepository.create({
      ...inscriptionDto,
      mot_de_passe: hashedPassword,
    });

    // Save user
    const savedUser = await this.utilisateursRepository.save(newUser);
    this.logger.log(`Utilisateur créé avec succès: ${savedUser.email} (ID: ${savedUser.id}, Rôle: ${savedUser.role})`);
    
    // Remove password from response
    delete savedUser.mot_de_passe;
    return savedUser;
  }

  async findAll() {
    this.logger.log('Récupération de tous les utilisateurs');
    const users = await this.utilisateursRepository.find({
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'photo', 'sexe', 'telephone', 'role'],
      relations: ['etablissement', 'filiere', 'niveau_etude'],
    });
    this.logger.log(`${users.length} utilisateur(s) trouvé(s)`);
    return users;
  }

  async findOne(id: string) {
    this.logger.log(`Recherche de l'utilisateur avec ID: ${id}`);
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'photo', 'sexe', 'telephone', 'role'],
      relations: ['etablissement', 'filiere', 'niveau_etude'],
    });

    if (!user) {
      this.logger.warn(`Utilisateur avec ID ${id} introuvable`);
      throw new NotFoundException('Utilisateur non trouvé');
    }

    this.logger.log(`Utilisateur trouvé: ${user.email} (ID: ${user.id})`);
    return user;
  }

  async update(id: string, majUtilisateurDto: MajUtilisateurDto) {
    this.logger.log(`Mise à jour de l'utilisateur ID: ${id}`);
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      this.logger.warn(`Mise à jour échouée: utilisateur ID ${id} introuvable`);
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Update user
    Object.assign(user, majUtilisateurDto);
    const updatedUser = await this.utilisateursRepository.save(user);
    this.logger.log(`Utilisateur mis à jour avec succès: ${updatedUser.email} (ID: ${updatedUser.id})`);
    
    // Remove password from response
    delete updatedUser.mot_de_passe;
    return updatedUser;
  }

  async remove(id: string) {
    this.logger.log(`Tentative de suppression de l'utilisateur ID: ${id}`);
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      this.logger.warn(`Suppression échouée: utilisateur ID ${id} introuvable`);
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.utilisateursRepository.remove(user);
    this.logger.log(`Utilisateur supprimé avec succès: ${user.email} (ID: ${id})`);
    return { message: 'Utilisateur supprimé avec succès' };
  }
}