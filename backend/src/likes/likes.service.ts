import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CreateLikeDto } from './dto/create-like.dto';
import { UpdateLikeDto } from './dto/update-like.dto';
import { Like } from './entities/like.entity';
import { LikeQueryDto, LikeType } from './dto/like-query.dto';
import { ParcoursService } from '../parcours/parcours.service';
import { CommentairesService } from '../commentaires/commentaires.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    private parcoursService: ParcoursService,
    private commentairesService: CommentairesService,
  ) { }

  /**
   * Ajoute un like/dislike
   * @param createLikeDto - Données du like/dislike
   * @returns Le like créé ou mis à jour
   * @throws BadRequestException si ni parcours_id ni commentaire_id n'est fourni
   * @throws NotFoundException si la ressource n'existe pas
   * @throws ConflictException si la combinaison existe déjà
   */
  async like(createLikeDto: CreateLikeDto): Promise<Like> {
    // Vérifier que soit parcours_id soit commentaire_id est fourni (mais pas les deux)
    if (!createLikeDto.parcours_id && !createLikeDto.commentaire_id) {
      throw new BadRequestException('Soit parcours_id soit commentaire_id doit être fourni');
    }

    if (createLikeDto.parcours_id && createLikeDto.commentaire_id) {
      throw new BadRequestException('Vous ne pouvez pas liker à la fois un parcours et un commentaire');
    }

    // Vérifier l'existence de la ressource
    if (createLikeDto.parcours_id) {
      await this.parcoursService.findOne(createLikeDto.parcours_id);
    }

    if (createLikeDto.commentaire_id) {
      await this.commentairesService.findOne(createLikeDto.commentaire_id);
    }

    // Vérifier si un like existe déjà pour cette combinaison
    const existingLike = await this.likeRepository.findOne({
      where: {
        utilisateur_id: createLikeDto.utilisateur_id,
        parcours_id: createLikeDto.parcours_id || null,
        commentaire_id: createLikeDto.commentaire_id || null,
      },
    });

    if (existingLike) {
      // Basculer entre like et dislike
      existingLike.type = existingLike.type === LikeType.LIKE ? LikeType.DISLIKE : LikeType.LIKE;

      if (existingLike.type === LikeType.DISLIKE) {
        existingLike.date_dislike = new Date();
      } else {
        existingLike.date_dislike = null;
      }

      return await this.likeRepository.save(existingLike);
    }

    // Créer un nouveau like
    const like = this.likeRepository.create({
      ...createLikeDto,
      type: LikeType.LIKE,
    });

    return await this.likeRepository.save(like);
  }

  /**
   * Récupère tous les likes avec pagination et filtres
   * @param query - Paramètres de requête
   * @returns Liste paginée des likes
   */
  async findAll(query: LikeQueryDto): Promise<{
    data: Like[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Like> = {};

    if (filters.parcours_id) {
      where.parcours_id = filters.parcours_id;
    }

    if (filters.commentaire_id) {
      where.commentaire_id = filters.commentaire_id;
    }

    if (filters.utilisateur_id) {
      where.utilisateur_id = filters.utilisateur_id;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    // Filtrage par date range
    if (filters.date_debut && filters.date_fin) {
      where.date_like = Between(filters.date_debut, filters.date_fin);
    } else if (filters.date_debut) {
      where.date_like = MoreThanOrEqual(filters.date_debut);
    } else if (filters.date_fin) {
      where.date_like = LessThanOrEqual(filters.date_fin);
    }

    const [data, total] = await this.likeRepository.findAndCount({
      where,
      order: { [filters.sortBy]: filters.order },
      skip,
      take: limit,
      relations: ['parcours', 'commentaire'],
    });

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
   * Récupère un like par son ID
   * @param id - ID du like
   * @returns Le like trouvé
   * @throws NotFoundException si le like n'existe pas
   */
  async findOne(id: number): Promise<Like> {
    const like = await this.likeRepository.findOne({
      where: { id },
      relations: ['parcours', 'commentaire'],
    });

    if (!like) {
      throw new NotFoundException(`Like avec l'ID ${id} non trouvé`);
    }

    return like;
  }

  /**
   * Met à jour un like existant
   * @param id - ID du like à mettre à jour
   * @param updateLikeDto - Données de mise à jour
   * @returns Le like mis à jour
   * @throws NotFoundException si le like n'existe pas
   */
  async update(id: number, updateLikeDto: UpdateLikeDto): Promise<Like> {
    const like = await this.findOne(id);

    // Vérifier les contraintes
    if (updateLikeDto.parcours_id && updateLikeDto.commentaire_id) {
      throw new BadRequestException('Vous ne pouvez pas liker à la fois un parcours et un commentaire');
    }

    if (updateLikeDto.parcours_id) {
      await this.parcoursService.findOne(updateLikeDto.parcours_id);
    }

    if (updateLikeDto.commentaire_id) {
      await this.commentairesService.findOne(updateLikeDto.commentaire_id);
    }

    // Vérifier l'unicité si utilisateur_id, parcours_id ou commentaire_id change
    if (updateLikeDto.utilisateur_id || updateLikeDto.parcours_id || updateLikeDto.commentaire_id) {
      const existingLike = await this.likeRepository.findOne({
        where: {
          utilisateur_id: updateLikeDto.utilisateur_id || like.utilisateur_id,
          parcours_id: updateLikeDto.parcours_id || like.parcours_id,
          commentaire_id: updateLikeDto.commentaire_id || like.commentaire_id,
        },
      });

      if (existingLike && existingLike.id !== id) {
        throw new ConflictException('Un like existe déjà pour cette combinaison utilisateur/ressource');
      }
    }

    Object.assign(like, updateLikeDto);
    return await this.likeRepository.save(like);
  }

  /**
   * Supprime un like
   * @param id - ID du like à supprimer
   * @throws NotFoundException si le like n'existe pas
   */
  async remove(id: number): Promise<void> {
    const result = await this.likeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Like avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Récupère les statistiques de likes d'un parcours
   * @param parcoursId - ID du parcours
   * @returns Statistiques des likes
   */
  async getParcoursStats(parcoursId: number): Promise<{
    totalLikes: number;
    totalDislikes: number;
    likesToday: number;
    dislikesToday: number;
    averageLikesPerDay: number;
  }> {
    // Vérifier que le parcours existe
    await this.parcoursService.findOne(parcoursId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Totaux
    const totalLikes = await this.likeRepository.count({
      where: { parcours_id: parcoursId, type: LikeType.LIKE },
    });

    const totalDislikes = await this.likeRepository.count({
      where: { parcours_id: parcoursId, type: LikeType.DISLIKE },
    });

    // Aujourd'hui
    const likesToday = await this.likeRepository.count({
      where: {
        parcours_id: parcoursId,
        type: LikeType.LIKE,
        date_like: MoreThanOrEqual(today),
      },
    });

    const dislikesToday = await this.likeRepository.count({
      where: {
        parcours_id: parcoursId,
        type: LikeType.DISLIKE,
        date_like: MoreThanOrEqual(today),
      },
    });

    // Moyenne par jour (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysLikes = await this.likeRepository.count({
      where: {
        parcours_id: parcoursId,
        type: LikeType.LIKE,
        date_like: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    const averageLikesPerDay = last30DaysLikes / 30;

    return {
      totalLikes,
      totalDislikes,
      likesToday,
      dislikesToday,
      averageLikesPerDay: Math.round(averageLikesPerDay * 100) / 100,
    };
  }

  /**
   * Récupère les likes d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @param query - Paramètres de pagination
   * @returns Likes de l'utilisateur
   */
  async findByUser(userId: number, query: LikeQueryDto): Promise<{
    data: Like[];
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
   * Vérifie si un utilisateur a liké une ressource
   * @param userId - ID de l'utilisateur
   * @param parcoursId - ID du parcours (optionnel)
   * @param commentaireId - ID du commentaire (optionnel)
   * @returns L'état du like
   */
  async checkUserLike(
    userId: number,
    parcoursId?: number,
    commentaireId?: number,
  ): Promise<{
    hasLiked: boolean;
    hasDisliked: boolean;
    like: Like | null;
  }> {
    const like = await this.likeRepository.findOne({
      where: {
        utilisateur_id: userId,
        parcours_id: parcoursId || null,
        commentaire_id: commentaireId || null,
      },
    });

    return {
      hasLiked: !!like && like.type === LikeType.LIKE,
      hasDisliked: !!like && like.type === LikeType.DISLIKE,
      like: like || null,
    };
  }

  /**
   * Récupère les utilisateurs qui ont liké une ressource
   * @param parcoursId - ID du parcours
   * @param commentaireId - ID du commentaire
   * @param type - Type de like
   * @param query - Pagination
   * @returns Liste des utilisateurs
   */
  async getLikers(
    parcoursId?: number,
    commentaireId?: number,
    type?: LikeType,
    query: LikeQueryDto = { page: 1, limit: 20 },
  ): Promise<{
    data: Like[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return await this.findAll({
      ...query,
      parcours_id: parcoursId,
      commentaire_id: commentaireId,
      type,
    });
  }
}