import { Injectable, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Repository, Brackets, LessThan, IsNull } from 'typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { Prestataire } from '../prestataires/entities/prestataire.entity';
import { Recruteur } from '../recruteurs/entities/recruteur.entity';
import { Departement } from '../departements/entities/departement.entity';
import { Ville } from '../villes/entities/ville.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CountryContextService } from '../config/country-context.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FilterUtilisateurDto } from './dto/filter-utilisateur.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { ValidateEmailDto } from './dto/verify-email.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '../firebase/firebase.service';


import { FichiersService } from 'src/fichiers/fichiers.service';
import { TypeFichier } from 'src/fichiers/entities/fichier.entity';
import { MailService } from '../mail/mail.service';
import { IsEmail } from 'class-validator';
import * as crypto from 'crypto';

@Injectable()
export class UtilisateursService {
  private readonly logger = new Logger(UtilisateursService.name);

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly context: CountryContextService,
    private readonly fichiersService: FichiersService,
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
  ) { }

  private get utilisateursRepository(): Repository<Utilisateur> {
    return this.resolver.getRepository(Utilisateur);
  }

  // geo-profile: repos for validating the profile pays -> departement -> ville cascade
  private get departementRepository(): Repository<Departement> {
    return this.resolver.getRepository(Departement);
  }
  private get villeRepository(): Repository<Ville> {
    return this.resolver.getRepository(Ville);
  }

  // geo-profile: validate departement_id/ville_id against the user's pays before save.
  // Throws 400 (not 404). Accepts explicit null to clear. Only runs for keys
  // actually present on the DTO, so unrelated profile updates are untouched.
  private async validateGeo(
    userPays: string,
    dto: { departement_id?: string | null; ville_id?: string | null },
    user: Utilisateur,
  ): Promise<void> {
    const hasDept = dto.departement_id !== undefined;
    const hasVille = dto.ville_id !== undefined;
    if (!hasDept && !hasVille) return;

    const finalDeptId = hasDept ? dto.departement_id : user.departement_id;
    const finalVilleId = hasVille ? dto.ville_id : user.ville_id;

    if (finalDeptId != null) {
      const departement = await this.departementRepository.findOne({
        where: { id: finalDeptId, pays: userPays },
      });
      if (!departement) {
        throw new BadRequestException(
          `Le département ${finalDeptId} n'existe pas pour ce pays`,
        );
      }
    }

    if (finalVilleId != null) {
      if (finalDeptId == null) {
        throw new BadRequestException(
          'Une ville ne peut être définie sans département',
        );
      }
      const ville = await this.villeRepository.findOne({
        where: { id: finalVilleId },
      });
      if (!ville || ville.departement_id !== finalDeptId) {
        throw new BadRequestException(
          `La ville ${finalVilleId} n'appartient pas au département ${finalDeptId}`,
        );
      }
    }
  }

  /**
   * Expose le chemin public de la photo de profil (`profil_photo_path`) sous la
   * clé `profil` sur chaque utilisateur renvoyé par l'API. Aucun
   * ClassSerializerInterceptor n'étant en place, `profil` doit être une vraie
   * propriété de l'objet (et non un getter de prototype) pour apparaître dans le
   * JSON. La valeur est renvoyée verbatim ; le fallback `''` reflète simplement
   * le défaut de la colonne (NOT NULL, default '') quand l'instance en mémoire
   * n'a pas encore été hydratée (ex. juste après une insertion).
   */
  private withProfil<T extends Utilisateur>(user: T): T & { profil: string } {
    return Object.assign(user, { profil: user.profil_photo_path ?? '' });
  }

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

  async inscription(pays: string, inscriptionDto: InscriptionDto) {
    this.logger.log(`Tentative d'inscription pour: ${inscriptionDto.email} (pays=${pays})`);

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
        return this.withProfil(savedUser);
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
      pays,
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
    return this.withProfil(savedUser);
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

  async findAll(pays: string, filterDto: FilterUtilisateurDto): Promise<PaginationResponse<Utilisateur>> {
    const { page = 1, limit = 10, search, role, activated, sort_by, sort_order, parrain_id } = filterDto;
    this.logger.log(`Récupération des utilisateurs (pays=${pays}) - Page: ${page}, Limite: ${limit}, Search: ${search}, Role: ${role}, Activated: ${activated}, SortBy: ${sort_by}, Order: ${sort_order}, ParrainId: ${parrain_id}`);

    const queryBuilder = this.utilisateursRepository.createQueryBuilder('utilisateur')
      .leftJoinAndSelect('utilisateur.etablissement', 'etablissement')
      .leftJoinAndSelect('utilisateur.filiere', 'filiere')
      .leftJoinAndSelect('utilisateur.niveau_etude', 'niveau_etude')
      .loadRelationCountAndMap('utilisateur.filleulsCount', 'utilisateur.filleuls')
      .select(['utilisateur.id', 'utilisateur.nom', 'utilisateur.prenom', 'utilisateur.email', 'utilisateur.pseudo', 'utilisateur.uuid', 'utilisateur.photo', 'utilisateur.profil_photo_path', 'utilisateur.profil_photo_extension', 'utilisateur.sexe', 'utilisateur.telephone', 'utilisateur.role', 'utilisateur.pays', 'utilisateur.est_desactive', 'utilisateur.date_suppression_prevue', 'utilisateur.date_creation', 'utilisateur.mon_code_parrainage', 'etablissement', 'filiere', 'niveau_etude'])
      .where('utilisateur.pays = :pays', { pays })
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
      data: users.map((user) => this.withProfil(user)),
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
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'uuid', 'photo', 'profil_photo_path', 'profil_photo_extension', 'sexe', 'telephone', 'role', 'mon_code_parrainage', 'departement_id', 'ville_id',
        // geo-profile (D4): previously-dropped profile fields
        'pays', 'date_naissance', 'zone_residence', 'situation_handicap', 'date_creation'],
      relations: ['etablissement', 'filiere', 'niveau_etude', 'departement', 'ville'],
    });

    if (!user) {
      this.logger.warn(`Utilisateur avec ID ${id} introuvable`);
      throw new NotFoundException('Utilisateur non trouvé');
    }

    this.logger.log(`Utilisateur trouvé: ${user.email} (ID: ${user.id})`);
    return this.withProfil(user);
  }

  async findByUuid(uuid: string) {
    this.logger.log(`Recherche de l'utilisateur avec UUID: ${uuid}`);
    const user = await this.utilisateursRepository.findOne({
      where: { uuid },
      select: ['id', 'nom', 'prenom', 'email', 'pseudo', 'uuid', 'photo', 'profil_photo_path', 'profil_photo_extension', 'sexe', 'telephone', 'role', 'mon_code_parrainage',
        // geo-profile (D4): previously-dropped profile fields
        'pays', 'date_naissance', 'zone_residence', 'situation_handicap', 'date_creation'],
      relations: ['etablissement', 'filiere', 'niveau_etude'],
    });

    if (!user) {
      this.logger.warn(`Utilisateur avec UUID ${uuid} introuvable`);
      throw new NotFoundException('Utilisateur non trouvé');
    }

    this.logger.log(`Utilisateur trouvé: ${user.email} (UUID: ${user.uuid})`);
    return this.withProfil(user);
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

    // geo-profile: enforce the pays -> departement -> ville cascade
    await this.validateGeo(user.pays, majUtilisateurDto, user);

    // Update user
    Object.assign(user, majUtilisateurDto);
    const updatedUser = await this.utilisateursRepository.save(user);
    this.logger.log(`Utilisateur mis à jour avec succès: ${updatedUser.email} (ID: ${updatedUser.id})`);

    // Remove password from response
    delete updatedUser.mot_de_passe;
    return this.withProfil(updatedUser);
  }

  async isEmailVerified(userId: number): Promise<{ isVerified: boolean }> {
    const user = await this.utilisateursRepository.findOne({ where: { id: userId }, select: ['verifier'] });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return { isVerified: user.verifier || false };
  }

  async isPrestataire(userId: number): Promise<{ isPrestataire: boolean }> {
    const prestataire = await this.resolver.getRepository(Prestataire).findOne({
      where: { utilisateur_id: userId },
    });
    return { isPrestataire: !!prestataire };
  }

  async isRecruteur(userId: number): Promise<{ isRecruteur: boolean }> {
    const recruteur = await this.resolver.getRepository(Recruteur).findOne({
      where: { utilisateur_id: userId },
    });
    return { isRecruteur: !!recruteur };
  }

  async verifyEmail(email: string) {
    this.logger.log(`Demande de vérification de l\'email pour: ${email}`);
    const user = await this.utilisateursRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 1 day from now
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 1);

    user.digit_code = code;
    user.date_expiration_code = expiration;
    await this.utilisateursRepository.save(user);

    await this.mailService.sendVerifyEmailCode(email, code);

    this.logger.log(`Code de vérification envoyé à l\\'utilisateur: ${email}`);
    return { message: 'Code de vérification envoyé avec succès' };
  }

  async validateEmail(validateEmailDto: ValidateEmailDto) {
    const { email, code } = validateEmailDto;

    this.logger.log(`Validation de l\'email pour: ${email}`);
    const user = await this.utilisateursRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.digit_code !== code) {
      user.verifier = false;
      await this.utilisateursRepository.save(user);
      throw new BadRequestException('Code de validation incorrect');
    }

    if (new Date() > user.date_expiration_code) {
      user.verifier = false;
      await this.utilisateursRepository.save(user);
      throw new BadRequestException('Le code de validation a expiré');
    }

    user.verifier = true;
    user.digit_code = null;
    user.date_expiration_code = null;
    await this.utilisateursRepository.save(user);

    this.logger.log(`Email validé avec succès pour: ${email}`);
    return { message: 'Email vérifié avec succès', verifier: true };
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
    user.digit_code = code;
    user.date_expiration_code = expiration;
    await this.utilisateursRepository.save(user);
  }

  async updatePassword(id: number, hashedPassword: string) {
    await this.utilisateursRepository.update(id, {
      mot_de_passe: hashedPassword,
      digit_code: null,
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
    await this.context.runForEachCountry(async (country) => {
      this.logger.log(`Cron de suppression des utilisateurs pour ${country}...`);

      const usersToDelete = await this.utilisateursRepository.find({
        where: {
          est_desactive: true,
          date_suppression_prevue: LessThan(new Date()),
        },
      });

      for (const user of usersToDelete) {
        this.logger.log(`Suppression définitive: pays=${country}, ID=${user.id}`);
        await this.utilisateursRepository.remove(user);
      }

      this.logger.log(`${country}: ${usersToDelete.length} utilisateurs supprimés définitivement.`);
    });
  }
}