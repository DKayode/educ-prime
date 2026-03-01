import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, LessThan, IsNull } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilterUtilisateurDto } from './dto/filter-utilisateur.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../firebase/firebase.service';


import { FichiersService } from 'src/fichiers/fichiers.service';
import { TypeFichier } from 'src/fichiers/entities/fichier.entity';
import { IsEmail } from 'class-validator';
import * as crypto from 'crypto';

@Injectable()
export class UtilisateursService {
  private readonly logger = new Logger(UtilisateursService.name);

  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateursRepository: Repository<Utilisateur>,
    private firebaseService: FirebaseService,
    private readonly fichiersService: FichiersService,
  ) { }

  async findByEmail(email: string) {
    this.logger.log(`Recherche de l'utilisateur par email: ${email}`);
    return this.utilisateursRepository.findOne({
      where: { email }
    });
  }

  async findByIdentifier(identifier: string) {
    this.logger.log(`Recherche de l'utilisateur par identifiant (email ou pseudo): ${identifier}`);
    return this.utilisateursRepository.findOne({
      where: [
        { email: identifier },
        { pseudo: identifier }
      ]
    });
  }

  async inscription(inscriptionDto: InscriptionDto) {
    this.logger.log(`Tentative d'inscription pour: ${inscriptionDto.email}`);

    // Check if email already exists
    const existingUser = await this.utilisateursRepository.findOne({
      where: { email: inscriptionDto.email },
    });

    if (existingUser) {
      // Check if user is soft deleted (marked for deletion)
      if (existingUser.est_desactive && existingUser.date_suppression_prevue) {
        this.logger.log(`Réactivation du compte pour: ${inscriptionDto.email}`);

        // Hash new password
        const hashedPassword = await bcrypt.hash(inscriptionDto.mot_de_passe, 10);

        // Update user properties
        const updatedUser = this.utilisateursRepository.merge(existingUser, {
          ...inscriptionDto,
          mot_de_passe: hashedPassword,
          est_desactive: false,
          date_suppression_prevue: null,
        });

        // Save reactivated user
        const savedUser = await this.utilisateursRepository.save(updatedUser);
        this.logger.log(`Utilisateur réactivé avec succès: ${savedUser.email} (ID: ${savedUser.id})`);

        // Remove password from response
        delete savedUser.mot_de_passe;
        return savedUser;
      }

      this.logger.warn(`Échec de l'inscription: email ${inscriptionDto.email} déjà utilisé et compte actif`);
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    // Check if pseudo already exists (if provided)
    if (inscriptionDto.pseudo) {
      const existingUserPseudo = await this.utilisateursRepository.findOne({
        where: { pseudo: inscriptionDto.pseudo },
      });

      if (existingUserPseudo) {
        this.logger.warn(`Échec de l'inscription: pseudo ${inscriptionDto.pseudo} déjà utilisé`);
        throw new ConflictException('Un utilisateur avec ce pseudo existe déjà');
      }
    }

    // Check if pseudo already exists (if provided)
    if (inscriptionDto.pseudo) {
      const existingUserPseudo = await this.utilisateursRepository.findOne({
        where: { pseudo: inscriptionDto.pseudo },
      });

      if (existingUserPseudo) {
        this.logger.warn(`Échec de l'inscription: pseudo ${inscriptionDto.pseudo} déjà utilisé`);
        throw new ConflictException('Un utilisateur avec ce pseudo existe déjà');
      }
    }

    // Verifier le parrain si le code est fourni
    let parrain: Utilisateur | null = null;
    if (inscriptionDto.code_parrainage) {
      this.logger.log(`Recherche du parrain avec le code: ${inscriptionDto.code_parrainage}`);
      parrain = await this.utilisateursRepository.findOne({
        where: { mon_code_parrainage: inscriptionDto.code_parrainage }
      });
      if (parrain) {
        this.logger.log(`Parrain trouvé: ${parrain.email}`);
      } else {
        this.logger.warn(`Aucun parrain trouvé avec le code: ${inscriptionDto.code_parrainage}`);
      }
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(inscriptionDto.mot_de_passe, 10);

    // Generate unique referral code for the new user
    let monCodeParrainage = this.generateReferralCode();
    // Ensure uniqueness
    while (await this.utilisateursRepository.findOne({ where: { mon_code_parrainage: monCodeParrainage } })) {
      monCodeParrainage = this.generateReferralCode();
    }

    // Create new user with hashed password
    const newUser = this.utilisateursRepository.create({
      ...inscriptionDto,
      mot_de_passe: hashedPassword,
      parrain: parrain,
      mon_code_parrainage: monCodeParrainage,
      uuid: crypto.randomUUID()
    });

    // Save user
    const savedUser = await this.utilisateursRepository.save(newUser);
    this.logger.log(`Utilisateur créé avec succès: ${savedUser.email} (ID: ${savedUser.id}, Rôle: ${savedUser.role}, Code Parrainage: ${savedUser.mon_code_parrainage})`);

    // Remove password from response
    delete savedUser.mot_de_passe;
    return savedUser;
  }

  private generateReferralCode(): string {
    // Generate a code like "REF-A1B2C" or "KAYODE123"
    // Using simple alphanumeric random string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const length = 6;
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateMissingReferralCodes(): Promise<{ updated: number }> {
    const users = await this.utilisateursRepository.find({
      where: { mon_code_parrainage: IsNull() },
    });

    let updatedCount = 0;
    for (const user of users) {
      // Reuse existing generation logic (which checks uniqueness if we use the same pattern, 
      // but generateReferralCode() specifically returns a string. We need to ensure uniqueness loop here too or inside helper.
      // The helper I wrote earlier is private and just returns a string. 
      // Ideally I should refactor inscription's uniqueness logic into a helper, but for now I'll duplicate the simple uniqueness check or improve helper.
      // Actually inscription logic does: generate -> check DB -> retry.

      let code = this.generateReferralCode();
      while (await this.utilisateursRepository.findOne({ where: { mon_code_parrainage: code } })) {
        code = this.generateReferralCode();
      }

      user.mon_code_parrainage = code;
      await this.utilisateursRepository.save(user);
      updatedCount++;
    }

    this.logger.log(`Backfill complete: Generated referral codes for ${updatedCount} users.`);
    return { updated: updatedCount };
  }

  async generateMissingUuids(): Promise<{ updated: number }> {
    const users = await this.utilisateursRepository.find({
      where: { uuid: IsNull() },
    });

    let updatedCount = 0;
    for (const user of users) {
      user.uuid = crypto.randomUUID();
      await this.utilisateursRepository.save(user);
      updatedCount++;
    }

    this.logger.log(`Backfill complete: Generated UUIDs for ${updatedCount} users.`);
    return { updated: updatedCount };
  }

  async getReferralCode(id: number): Promise<{ code_parrainage: string }> {
    const user = await this.utilisateursRepository.findOne({
      where: { id },
      select: ['mon_code_parrainage'],
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return { code_parrainage: user.mon_code_parrainage };
  }

  async findAll(filterDto: FilterUtilisateurDto): Promise<PaginationResponse<Utilisateur>> {
    const { page = 1, limit = 10, search, role, activated, sort_by, sort_order, parrain_id } = filterDto;
    this.logger.log(`Récupération des utilisateurs - Page: ${page}, Limite: ${limit}, Search: ${search}, Role: ${role}, Activated: ${activated}, SortBy: ${sort_by}, Order: ${sort_order}, ParrainId: ${parrain_id}`);

    const queryBuilder = this.utilisateursRepository.createQueryBuilder('utilisateur')
      .leftJoinAndSelect('utilisateur.etablissement', 'etablissement')
      .leftJoinAndSelect('utilisateur.filiere', 'filiere')
      .leftJoinAndSelect('utilisateur.niveau_etude', 'niveau_etude')
      .loadRelationCountAndMap('utilisateur.filleulsCount', 'utilisateur.filleuls')
      .select(['utilisateur.id', 'utilisateur.nom', 'utilisateur.prenom', 'utilisateur.email', 'utilisateur.pseudo', 'utilisateur.uuid', 'utilisateur.photo', 'utilisateur.sexe', 'utilisateur.telephone', 'utilisateur.role', 'utilisateur.est_desactive', 'utilisateur.date_suppression_prevue', 'utilisateur.date_creation', 'utilisateur.mon_code_parrainage', 'etablissement', 'filiere', 'niveau_etude'])
      .skip((page - 1) * limit)
      .take(limit);

    // Sorting
    if (sort_by === 'date_creation') {
      queryBuilder.orderBy('utilisateur.date_creation', sort_order || 'DESC');
    } else if (sort_by === 'filleuls') {
      queryBuilder.addSelect((subQuery) => {
        return subQuery
          .select('COUNT(sub_u.id)', 'count')
          .from(Utilisateur, 'sub_u')
          .where('sub_u.parrain_id = utilisateur.id');
      }, 'filleuls_count');
      queryBuilder.orderBy('filleuls_count', sort_order || 'DESC');
    } else {
      // Default sort by ID (or whatever was default before, usually ID implicitly or creation order)
      queryBuilder.orderBy('utilisateur.id', sort_order || 'ASC');
    }

    if (role) {
      queryBuilder.andWhere('utilisateur.role = :role', { role });
    }

    if (activated !== undefined) {
      // activated = true => est_desactive = false
      // activated = false => est_desactive = true
      queryBuilder.andWhere('utilisateur.est_desactive = :estDesactive', { estDesactive: !activated });
    }

    if (parrain_id) {
      queryBuilder.andWhere('utilisateur.parrain_id = :parrainId', { parrainId: parrain_id });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(utilisateur.nom) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(utilisateur.email) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(utilisateur.pseudo) ILIKE unaccent(:search)', { search: `%${search}%` });
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
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'uuid', 'photo', 'sexe', 'telephone', 'role', 'mon_code_parrainage'],
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

  async setResetCode(email: string, code: string, expiration: Date) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    user.code_reinitialisation = code;
    user.date_expiration_code = expiration;
    await this.utilisateursRepository.save(user);
  }

  async updatePassword(id: number, hashedPassword: string) {
    await this.utilisateursRepository.update(id, {
      mot_de_passe: hashedPassword,
      code_reinitialisation: null,
      date_expiration_code: null
    });
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

    // const isValid = await this.firebaseService.validateToken(token);
    // if (!isValid) {
    //   this.logger.warn(`Token FCM invalide pour l'utilisateur ${userId}`);
    //   throw new NotFoundException(`FCM Token non valid`)
    // }

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



  async uploadPhoto(id: string, file: any) {
    this.logger.log(`Mise à jour de la photo de profil pour l'utilisateur ID: ${id}`);
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const uploadResult = await this.fichiersService.uploadFile(file, parseInt(id), {
      type: TypeFichier.PROFILE,
      entityId: parseInt(id),
    });

    user.photo = uploadResult.url;
    const updatedUser = await this.utilisateursRepository.save(user);

    delete updatedUser.mot_de_passe;
    return updatedUser;
  }

  async downloadPhoto(id: string) {
    this.logger.log(`Téléchargement de la photo pour l'utilisateur ID: ${id}`);
    const user = await this.utilisateursRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (!user.photo) {
      throw new NotFoundException('Aucune photo de profil disponible');
    }

    return this.fichiersService.downloadFile(user.photo);
  }

  async softDelete(id: number) {
    const user = await this.utilisateursRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    // Calculate deletion date (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    user.est_desactive = true;
    user.date_suppression_prevue = deletionDate;

    await this.utilisateursRepository.save(user);
    this.logger.log(`Utilisateur ID ${id} marqué pour suppression le ${deletionDate}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Exécution du Cron de suppression des utilisateurs...');

    const usersToDelete = await this.utilisateursRepository.find({
      where: {
        est_desactive: true,
        date_suppression_prevue: LessThan(new Date()),
      },
    });

    for (const user of usersToDelete) {
      this.logger.log(`Suppression définitive de l'utilisateur ID ${user.id}`);
      await this.utilisateursRepository.remove(user);
    }

    this.logger.log(`${usersToDelete.length} utilisateurs supprimés définitivement.`);
  }
}