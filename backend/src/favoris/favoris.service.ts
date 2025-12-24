import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CreateFavoriDto } from './dto/create-favoris.dto';
import { UpdateFavorisDto } from './dto/update-favoris.dto';
import { Favori } from './entities/favoris.entity';
import { FavoriQueryDto } from './dto/favoris-query.dto';
import { ParcoursService } from '../parcours/parcours.service';

@Injectable()
export class FavorisService {
  constructor(
    @InjectRepository(Favori)
    private favoriRepository: Repository<Favori>,
    private parcoursService: ParcoursService,
  ) { }

  /**
   * Ajoute un parcours aux favoris d'un utilisateur
   * @param createFavoriDto - Données pour créer le favori
   * @returns Le favori créé
   * @throws NotFoundException si le parcours n'existe pas
   * @throws ConflictException si le favori existe déjà
   */
  async create(createFavoriDto: CreateFavoriDto, userId: number): Promise<Favori> {
    // Vérifier que le parcours existe
    await this.parcoursService.findOne(createFavoriDto.parcours_id);

    // Vérifier si le favori existe déjà pour cet utilisateur
    const existingFavori = await this.favoriRepository.findOne({
      where: {
        parcours_id: createFavoriDto.parcours_id,
        utilisateur_id: userId, // Utiliser le userId passé en paramètre
      },
    });

    if (existingFavori) {
      throw new ConflictException('Ce parcours est déjà dans vos favoris');
    }

    // Créer le favori avec l'ID de l'utilisateur
    const favori = this.favoriRepository.create({
      ...createFavoriDto,
      utilisateur_id: userId, // Ajouter l'ID de l'utilisateur
    });

    const savedFavori = await this.favoriRepository.save(favori);

    // Charger les relations
    return await this.favoriRepository.findOne({
      where: { id: savedFavori.id },
      relations: ['parcours'],
    });
  }

  /**
   * Récupère tous les favoris avec pagination et filtres
   * @param query - Paramètres de requête
   * @returns Liste paginée des favoris
   */
  async findAll(query: FavoriQueryDto): Promise<{
    data: Favori[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Favori> = {};

    if (filters.parcours_id) {
      where.parcours_id = filters.parcours_id;
    }

    if (filters.utilisateur_id) {
      where.utilisateur_id = filters.utilisateur_id;
    }

    // Filtrage par date range
    if (filters.date_debut && filters.date_fin) {
      where.date_favoris = Between(filters.date_debut, filters.date_fin);
    } else if (filters.date_debut) {
      where.date_favoris = MoreThanOrEqual(filters.date_debut);
    } else if (filters.date_fin) {
      where.date_favoris = LessThanOrEqual(filters.date_fin);
    }

    const [data, total] = await this.favoriRepository.findAndCount({
      where,
      order: { [filters.sortBy]: filters.order },
      skip,
      take: limit,
      relations: ['parcours'],
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
   * Récupère un favori par son ID
   * @param id - ID du favori
   * @returns Le favori trouvé
   * @throws NotFoundException si le favori n'existe pas
   */
  async findOne(id: number): Promise<Favori> {
    const favori = await this.favoriRepository.findOne({
      where: { id },
      relations: ['parcours'],
    });

    if (!favori) {
      throw new NotFoundException(`Favori avec l'ID ${id} non trouvé`);
    }

    return favori;
  }

  /**
   * Met à jour un favori existant
   * @param id - ID du favori à mettre à jour
   * @param updateFavoriDto - Données de mise à jour
   * @returns Le favori mis à jour
   * @throws NotFoundException si le favori n'existe pas
   */
  async update(id: number, updateFavoriDto: UpdateFavorisDto, userId: number): Promise<Favori> {
    const favori = await this.favoriRepository.findOne({
      where: { id },
    });

    if (!favori) {
      throw new NotFoundException(`Favori avec l'ID ${id} non trouvé`);
    }

    // Vérifier que l'utilisateur est propriétaire du favori
    if (favori.utilisateur_id !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier un favori qui ne vous appartient pas');
    }

    // Empêcher la modification de utilisateur_id
    if (userId) {
      throw new BadRequestException('Vous ne pouvez pas modifier l\'utilisateur d\'un favori');
    }

    // Si parcours_id est modifié, vérifier que le nouveau parcours existe
    if (updateFavoriDto.parcours_id && updateFavoriDto.parcours_id !== favori.parcours_id) {
      await this.parcoursService.findOne(updateFavoriDto.parcours_id);

      // Vérifier si l'utilisateur a déjà ce parcours dans ses favoris
      const existingFavori = await this.favoriRepository.findOne({
        where: {
          utilisateur_id: userId,
          parcours_id: updateFavoriDto.parcours_id,
        },
      });

      if (existingFavori && existingFavori.id !== id) {
        throw new ConflictException('Ce parcours est déjà dans vos favoris');
      }
    }

    // Mettre à jour le favori
    Object.assign(favori, updateFavoriDto);
    const updatedFavori = await this.favoriRepository.save(favori);

    // Charger les relations
    return await this.favoriRepository.findOne({
      where: { id: updatedFavori.id },
      relations: ['parcours'],
    });
  }

  /**
   * Supprime un favori
   * @param id - ID du favori à supprimer
   * @throws NotFoundException si le favori n'existe pas
   */
  async remove(id: number): Promise<void> {
    const result = await this.favoriRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Favori avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Supprime un favori par parcours et utilisateur
   * @param parcoursId - ID du parcours
   * @param userId - ID de l'utilisateur
   * @throws NotFoundException si le favori n'existe pas
   */
  async removeByParcoursAndUser(parcoursId: number, userId: number): Promise<void> {
    const result = await this.favoriRepository.delete({
      parcours_id: parcoursId,
      utilisateur_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Favori non trouvé pour ce parcours et cet utilisateur');
    }
  }

  /**
   * Récupère les favoris d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @param query - Paramètres de pagination
   * @returns Favoris de l'utilisateur
   */
  async findByUser(userId: number, query: FavoriQueryDto): Promise<{
    data: Favori[];
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
   * Récupère les favoris d'un parcours
   * @param parcoursId - ID du parcours
   * @param query - Paramètres de pagination
   * @returns Favoris du parcours
   */
  async findByParcours(parcoursId: number, query: FavoriQueryDto): Promise<{
    data: Favori[];
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
   * Vérifie si un parcours est dans les favoris d'un utilisateur
   * @param parcoursId - ID du parcours
   * @param userId - ID de l'utilisateur
   * @returns True si le parcours est dans les favoris
   */
  async isFavori(parcoursId: number, userId: number): Promise<boolean> {
    const favori = await this.favoriRepository.findOne({
      where: {
        parcours_id: parcoursId,
        utilisateur_id: userId,
      },
    });

    return !!favori;
  }

  /**
   * Récupère les statistiques des favoris
   * @param parcoursId - ID optionnel du parcours
   * @returns Statistiques des favoris
   */
  async getStats(parcoursId?: number): Promise<{
    total: number;
    totalToday: number;
    averagePerDay: number;
    mostFavoritedParcours?: number;
    mostActiveUser?: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: FindOptionsWhere<Favori> = {};
    if (parcoursId) {
      where.parcours_id = parcoursId;
    }

    // Total des favoris
    const total = await this.favoriRepository.count({ where });

    // Favoris d'aujourd'hui
    const totalToday = await this.favoriRepository.count({
      where: {
        ...where,
        date_favoris: MoreThanOrEqual(today),
      },
    });

    // Moyenne par jour (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30Days = await this.favoriRepository.count({
      where: {
        ...where,
        date_favoris: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    const averagePerDay = last30Days / 30;

    // Parcours le plus favori
    const mostFavorited = await this.favoriRepository
      .createQueryBuilder('favori')
      .select('favori.parcours_id', 'parcours_id')
      .addSelect('COUNT(favori.id)', 'count')
      .where(parcoursId ? '1=1' : '1=1')
      .groupBy('favori.parcours_id')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    // Utilisateur le plus actif (qui ajoute le plus de favoris)
    const mostActive = await this.favoriRepository
      .createQueryBuilder('favori')
      .select('favori.utilisateur_id', 'user_id')
      .addSelect('COUNT(favori.id)', 'count')
      .where(parcoursId ? '1=1' : '1=1')
      .groupBy('favori.utilisateur_id')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      total,
      totalToday,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
      mostFavoritedParcours: mostFavorited?.parcours_id,
      mostActiveUser: mostActive?.user_id,
    };
  }

  /**
   * Récupère le nombre de favoris d'un parcours
   * @param parcoursId - ID du parcours
   * @returns Nombre de favoris
   */
  async getFavoriCount(parcoursId: number): Promise<number> {
    return await this.favoriRepository.count({
      where: { parcours_id: parcoursId },
    });
  }
}