import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { FilterUtilisateurDto } from './dto/filter-utilisateur.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../firebase/firebase.service';


@Injectable()
export class UtilisateursService {
  private readonly logger = new Logger(UtilisateursService.name);

  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateursRepository: Repository<Utilisateur>,
    private firebaseService: FirebaseService,
  ) { }

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



  async findAll(filterDto: FilterUtilisateurDto): Promise<PaginationResponse<Utilisateur>> {
    const { page = 1, limit = 10, search, role } = filterDto;
    this.logger.log(`Récupération des utilisateurs - Page: ${page}, Limite: ${limit}, Search: ${search}, Role: ${role}`);

    const queryBuilder = this.utilisateursRepository.createQueryBuilder('utilisateur')
      .leftJoinAndSelect('utilisateur.etablissement', 'etablissement')
      .leftJoinAndSelect('utilisateur.filiere', 'filiere')
      .leftJoinAndSelect('utilisateur.niveau_etude', 'niveau_etude')
      .select(['utilisateur.id', 'utilisateur.nom', 'utilisateur.prenom', 'utilisateur.email', 'utilisateur.pseudo', 'utilisateur.photo', 'utilisateur.sexe', 'utilisateur.telephone', 'utilisateur.role', 'etablissement', 'filiere', 'niveau_etude'])
      .skip((page - 1) * limit)
      .take(limit);

    if (role) {
      queryBuilder.andWhere('utilisateur.role = :role', { role });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('utilisateur.nom ILIKE :search', { search: `%${search}%` })
            .orWhere('utilisateur.email ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${users.length} utilisateur(s) trouvé(s) sur ${total} total`);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  /**
   * Mettre à jour le token FCM d'un utilisateur
   * Si le token existe déjà, il est mis à jour
   */
  async updateFcmToken(
    userId: number,
    token: string,
  ): Promise<Utilisateur> {
    const user: Utilisateur = await this.utilisateursRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur ${userId} non trouvé`);
    }

    // Valider le token avec Firebase (optionnel)
    const isValid = await this.firebaseService.validateToken(token);
    if (!isValid) {
      this.logger.warn(`Token FCM invalide pour l'utilisateur ${userId}`);
    }

    // Vérifier si le token a changé
    if (user.fcm_token !== token) {
      user.fcm_token = token;

      const updatedUser = await this.utilisateursRepository.save(user);

      // Souscrire aux topics Firebase
      await this.subscribeToUserTopics(userId, token);

      this.logger.log(`Token FCM mis à jour pour l'utilisateur ${userId}`);
      return updatedUser;
    }

    return user;
  }

  /**
   * Souscrire un utilisateur aux topics Firebase
   */
  private async subscribeToUserTopics(userId: number, token: string): Promise<void> {
    try {
      const topics = [
        'all_users',
        `user_${userId}`,
        'notifications',
      ];

      for (const topic of topics) {
        try {
          await this.firebaseService.subscribeToTopic(token, topic);
          this.logger.log(`Utilisateur ${userId} abonné au topic: ${topic}`);
        } catch (error) {
          this.logger.warn(`Impossible d'abonner au topic ${topic}:`, error.message);
        }
      }
    } catch (error) {
      this.logger.error(`Erreur lors de l'abonnement aux topics:`, error.message);
    }
  }



}