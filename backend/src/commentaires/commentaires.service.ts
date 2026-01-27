import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThanOrEqual } from 'typeorm';
import { CreateCommentaireDto } from './dto/create-commentaire.dto';
import { UpdateCommentaireDto } from './dto/update-commentaire.dto';
import { Commentaire } from './entities/commentaire.entity';
import { CommentaireQueryDto } from './dto/commentaire-query.dto';
import { ParcoursService } from '../parcours/parcours.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';

@Injectable()
export class CommentairesService {
  constructor(
    @InjectRepository(Commentaire)
    private commentaireRepository: Repository<Commentaire>,
    private parcoursService: ParcoursService,
    private utilisateursService: UtilisateursService,
  ) { }

  /**
   * Crée un nouveau commentaire
   * @param createCommentaireDto - Données pour créer le commentaire
   * @returns Le commentaire créé
   * @throws NotFoundException si le parcours n'existe pas
   * @throws NotFoundException si le commentaire parent n'existe pas
   */
  async create(createCommentaireDto: CreateCommentaireDto, userId: number): Promise<Commentaire> {
    // Vérifier que le parcours existe
    await this.parcoursService.findOne(createCommentaireDto.parcours_id);

    // Si parent_id est fourni, vérifier que le parent existe
    if (createCommentaireDto.parent_id) {
      const parent = await this.commentaireRepository.findOne({
        where: { id: createCommentaireDto.parent_id },
      });
      if (!parent) {
        throw new NotFoundException(`Commentaire parent avec l'ID ${createCommentaireDto.parent_id} non trouvé`);
      }

      // Vérifier que le parent appartient au même parcours
      if (parent.parcours_id !== createCommentaireDto.parcours_id) {
        throw new BadRequestException('Le commentaire parent doit appartenir au même parcours');
      }
    }

    // Créer le commentaire avec l'ID de l'utilisateur
    const commentaire = this.commentaireRepository.create({
      ...createCommentaireDto,
      utilisateur_id: userId,
    });

    const savedCommentaire = await this.commentaireRepository.save(commentaire);

    // Charger les relations (ajouter 'user' si nécessaire)
    return await this.commentaireRepository.findOne({
      where: { id: savedCommentaire.id },
      relations: ['parcours', 'parent', 'enfants'],  // Ajouter 'user' aux relations
    });
  }

  /**
 * Récupère tous les commentaires avec pagination et filtres
 * @param query - Paramètres de requête
 * @returns Liste paginée des commentaires avec métadonnées
 */
  async findAll(query: CommentaireQueryDto): Promise<{
    data: any[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;

    // Requête principale pour les commentaires parents
    const qb = this.commentaireRepository
      .createQueryBuilder('commentaire')
      .leftJoinAndSelect('commentaire.utilisateur', 'utilisateur')
      .leftJoinAndSelect('commentaire.parcours', 'parcours')
      .leftJoinAndSelect('commentaire.likes', 'likes')
      .leftJoin('commentaire.parent', 'parent')
      .addSelect([
        'parent.id',
        'parent.contenu',
        'parent.date_commentaire'
      ])
      // Compte le nombre d'enfants (réponses)
      .loadRelationCountAndMap('commentaire.enfantsCount', 'commentaire.enfants')
      // Compte SEULEMENT les likes de type 'like' (pas les dislikes)
      .loadRelationCountAndMap('commentaire.likesCount', 'commentaire.likes', 'like',
        qb => qb.andWhere('like.type = :likeType', { likeType: 'like' }))
      .select([
        'commentaire',
        'utilisateur.id',
        'utilisateur.nom',
        'utilisateur.prenom',
        'utilisateur.photo',
        'utilisateur.email',
        'parcours.id',
        'parcours.titre',
        'likes.id',
        'likes.type', // Important pour filtrer côté client si besoin
        'likes.utilisateur_id',
        'likes.commentaire_id'
      ]);

    if (filters.parcours_id) {
      qb.andWhere('commentaire.parcours_id = :parcours_id', {
        parcours_id: filters.parcours_id,
      });
    }

    if (filters.utilisateur_id) {
      qb.andWhere('commentaire.utilisateur_id = :utilisateur_id', {
        utilisateur_id: filters.utilisateur_id,
      });
    }

    if (filters.parent_id !== undefined) {
      if (filters.parent_id === null) {
        qb.andWhere('commentaire.parent_id IS NULL');
      } else {
        qb.andWhere('commentaire.parent_id = :parent_id', {
          parent_id: filters.parent_id,
        });
      }
    } else {
      qb.andWhere('commentaire.parent_id IS NULL');
    }

    if (filters.date_commentaire) {
      qb.andWhere('DATE(commentaire.date_commentaire) = DATE(:date_commentaire)', {
        date_commentaire: filters.date_commentaire,
      });
    }

    qb.orderBy(`commentaire.${filters.sortBy || 'date_commentaire'}`, filters.order || 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  /**
   * Récupère un commentaire par son ID
   * @param id - ID du commentaire
   * @returns Le commentaire trouvé avec ses relations
   * @throws NotFoundException si le commentaire n'existe pas
   */
  async findOne(id: number): Promise<Commentaire> {
    const commentaire = await this.commentaireRepository.findOne({
      where: { id },
      relations: ['parcours', 'likes', 'parent', 'enfants'],
    });

    if (!commentaire) {
      throw new NotFoundException(`Commentaire avec l'ID ${id} non trouvé`);
    }

    // Compter les réponses
    const enfantsCount = await this.commentaireRepository.count({
      where: { parent_id: commentaire.id },
    });

    const likesCount = await this.commentaireRepository.count({
      where: { parent_id: commentaire.id },
    });

    return {
      ...commentaire,
      likesCount: commentaire.likes?.filter(like => like.type == "like").length || 0,
      enfantsCount: commentaire.enfantsCount || 0,
    };

    // return {
    //   ...commentaire,
    //   enfantsCount,
    // };
  }

  /**
   * Met à jour un commentaire existant
   * @param id - ID du commentaire à mettre à jour
   * @param updateCommentaireDto - Données de mise à jour
   * @returns Le commentaire mis à jour
   * @throws NotFoundException si le commentaire n'existe pas
   */
  async update(id: number, updateCommentaireDto: UpdateCommentaireDto): Promise<Commentaire> {
    const commentaire = await this.findOne(id);

    // Vérifier que le parent existe si fourni
    if (updateCommentaireDto.parent_id && updateCommentaireDto.parent_id !== commentaire.parent_id) {
      const parent = await this.commentaireRepository.findOne({
        where: { id: updateCommentaireDto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException(`Commentaire parent avec l'ID ${updateCommentaireDto.parent_id} non trouvé`);
      }

      // Vérifier qu'on ne crée pas de référence circulaire
      if (updateCommentaireDto.parent_id === id) {
        throw new BadRequestException('Un commentaire ne peut pas être son propre parent');
      }

      // Vérifier la profondeur maximale (par exemple, 3 niveaux)
      let currentParent = parent;
      let depth = 1;
      while (currentParent.parent_id && depth < 3) {
        currentParent = await this.commentaireRepository.findOne({
          where: { id: currentParent.parent_id },
        });
        depth++;
      }

      if (depth >= 3) {
        throw new BadRequestException('La profondeur maximale des commentaires est de 3 niveaux');
      }
    }

    Object.assign(commentaire, updateCommentaireDto);
    const updated = await this.commentaireRepository.save(commentaire);

    return await this.findOne(updated.id);
  }

  /**
   * Supprime un commentaire
   * @param id - ID du commentaire à supprimer
   * @throws NotFoundException si le commentaire n'existe pas
   */
  async remove(id: number): Promise<void> {
    // Vérifier si le commentaire existe
    const commentaire = await this.findOne(id);

    // Supprimer d'abord les réponses (cascades peuvent être configurées dans l'entité)
    await this.commentaireRepository.delete({ parent_id: id });

    // Supprimer le commentaire
    await this.commentaireRepository.delete(id);
  }

  /**
   * Récupère les réponses d'un commentaire
   * @param parentId - ID du commentaire parent
   * @param query - Paramètres de pagination
   * @returns Liste paginée des réponses
   */
  async findReplies(parentId: number, query: CommentaireQueryDto): Promise<{
    data: Commentaire[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return await this.findAll({
      ...query,
      parent_id: parentId,
    });
  }

  /**
   * Récupère les commentaires d'un parcours spécifique
   * @param parcoursId - ID du parcours
   * @param query - Paramètres de pagination et filtres
   * @returns Commentaires du parcours avec pagination
   */
  async findByParcours(parcoursId: number, query: CommentaireQueryDto): Promise<{
    data: Commentaire[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    // Vérifier que le parcours existe
    await this.parcoursService.findOne(parcoursId);

    return await this.findAll({
      ...query,
      parcours_id: parcoursId,
    });
  }

  /**
   * Récupère les commentaires d'un utilisateur spécifique
   * @param usersId - ID de l'utilisateur
   * @param query - Paramètres de pagination
   * @returns Commentaires de l'utilisateur
   */
  async findByUser(userId: number, query: CommentaireQueryDto): Promise<{
    data: Commentaire[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return await this.findAll({
      ...query,
      utilisateur_id: userId,
    });
  }

  /**
   * Récupère les statistiques des commentaires
   * @param parcoursId - ID optionnel du parcours
   * @returns Statistiques des commentaires
   */
  async getStats(parcoursId?: number): Promise<{
    total: number;
    totalToday: number;
    averagePerDay: number;
    mostActiveUser?: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: FindOptionsWhere<Commentaire> = {};
    if (parcoursId) {
      where.parcours_id = parcoursId;
    }

    // Total des commentaires
    const total = await this.commentaireRepository.count({ where });

    // Commentaires d'aujourd'hui
    const totalToday = await this.commentaireRepository.count({
      where: {
        ...where,
        date_commentaire: MoreThanOrEqual(today),
      },
    });

    // Moyenne par jour (sur les 30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30Days = await this.commentaireRepository.count({
      where: {
        ...where,
        date_commentaire: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    const averagePerDay = last30Days / 30;

    const mostActive = await this.commentaireRepository
      .createQueryBuilder('commentaire')
      .select('commentaire.utilisateur_id', 'user_id')
      .addSelect('COUNT(commentaire.id)', 'count')
      .where(parcoursId ? 'commentaire.parcours_id = :parcoursId' : '1=1', { parcoursId })
      .groupBy('commentaire.utilisateur_id')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      total,
      totalToday,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
      mostActiveUser: mostActive?.user_id,
    };
  }

  /**
   * Récupère la photo de l'utilisateur qui a fait le commentaire
   * @param id - ID du commentaire
   * @returns Buffer de la photo et informations
   */
  async getUtilisateurPhoto(id: number) {
    const commentaire = await this.findOne(id);
    return this.utilisateursService.downloadPhoto(commentaire.utilisateur_id.toString());
  }
}