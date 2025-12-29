import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like as TypeOrmLike, FindOptionsWhere, ILike, In } from 'typeorm';
import { CreateParcourDto } from './dto/create-parcour.dto';
import { UpdateParcourDto } from './dto/update-parcour.dto';
import { Parcour } from './entities/parcour.entity';
import { ParcourQueryDto } from './dto/parcour-query.dto';

@Injectable()
export class ParcoursService {
  constructor(
    @InjectRepository(Parcour)
    private parcoursRepository: Repository<Parcour>,
  ) { }

  /**
   * Crée un nouveau parcours
   * @param createParcoursDto - Données pour créer le parcours
   * @returns Le parcours créé
   */
  async create(createParcoursDto: CreateParcourDto): Promise<Parcour> {
    const parcours = this.parcoursRepository.create(createParcoursDto);
    return await this.parcoursRepository.save(parcours);
  }

  /**
   * Récupère tous les parcours avec pagination et filtres
   * @param query - Paramètres de requête (pagination, filtres)
   * @returns Liste paginée des parcours avec métadonnées
   */
  async findAll(query: ParcourQueryDto): Promise<{
    data: Parcour[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, ...filters } = query;
    const skip = (page - 1) * limit;

    // Construction de la clause WHERE
    const where: FindOptionsWhere<Parcour> = {};

    if (filters.titre) {
      where.titre = ILike(`%${filters.titre}%`);
    }

    // CORRECTION ICI : Filtre par category_id
    if (filters.category_id) {
      // Si category_id est un nombre
      if (typeof filters.category_id === 'number') {
        where.category = { id: filters.category_id } as any;
      }
      // Si c'est un tableau d'IDs
      else if (Array.isArray(filters.category_id)) {
        where.category = { id: In(filters.category_id) } as any;
      }
    }

    if (filters.type_media) {
      where.type_media = filters.type_media;
    }

    // Recherche globale sur plusieurs champs
    if (filters.search) {
      where.titre = ILike(`%${filters.search}%`);
      // Pour rechercher sur plusieurs champs :
      // where = [
      //   { titre: ILike(`%${filters.search}%`) },
      //   { description: ILike(`%${filters.search}%`) }
      // ] as FindOptionsWhere<Parcour>[];
    }

    // Exécution de la requête
    const [data, total] = await this.parcoursRepository.findAndCount({
      where,
      order: { [filters.sortBy]: filters.order },
      skip,
      take: limit,
      relations: ['commentaires', 'likes', 'favoris'],
    });

    // Ajout des compteurs
    const parcoursWithCounts = data.map(parcours => ({
      ...parcours,
      commentairesCount: parcours.commentaires?.length || 0,
      likesCount: parcours.likes?.filter(like => like.type == "like").length || 0,
      favorisCount: parcours.favoris?.length || 0,
    }));

    return {
      data: parcoursWithCounts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupère un parcours par son ID
   * @param id - ID du parcours
   * @returns Le parcours trouvé
   * @throws NotFoundException si le parcours n'existe pas
   */
  async findOne(id: number): Promise<Parcour> {
    const parcours = await this.parcoursRepository.findOne({
      where: { id },
      relations: ['commentaires', 'likes', 'favoris'],
    });

    if (!parcours) {
      throw new NotFoundException(`Parcours avec l'ID ${id} non trouvé`);
    }

    // Ajout des compteurs
    return {
      ...parcours,
      commentairesCount: parcours.commentaires?.length || 0,
      likesCount: parcours.likes?.filter(like => like.type == "like").length || 0,
      favorisCount: parcours.favoris?.length || 0,
    };
  }

  /**
   * Met à jour un parcours existant
   * @param id - ID du parcours à mettre à jour
   * @param updateParcoursDto - Données de mise à jour
   * @returns Le parcours mis à jour
   * @throws NotFoundException si le parcours n'existe pas
   */
  async update(id: number, updateParcoursDto: UpdateParcourDto): Promise<Parcour> {
    const parcours = await this.findOne(id);
    Object.assign(parcours, updateParcoursDto);
    return await this.parcoursRepository.save(parcours);
  }

  /**
   * Supprime un parcours
   * @param id - ID du parcours à supprimer
   * @throws NotFoundException si le parcours n'existe pas
   */
  async remove(id: number): Promise<void> {
    const result = await this.parcoursRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Parcours avec l'ID ${id} non trouvé`);
    }
  }

  /**
   * Recherche des parcours par terme de recherche
   * @param search - Terme de recherche
   * @param limit - Nombre maximum de résultats
   * @returns Liste des parcours correspondants
   */
  async search(search: string, limit: number = 10): Promise<Parcour[]> {
    return await this.parcoursRepository.find({
      where: [
        { titre: ILike(`%${search}%`) },
        { description: ILike(`%${search}%`) },
        { category: ILike(`%${search}%`) },
      ],
      take: limit,
    });
  }
  async findOneForDownloadImage(id: number): Promise<{ url: string; titre: string }> {
    const parcours = await this.findOne(id);
    if (!parcours.image_couverture) {
      throw new NotFoundException('Parcours n\'a pas d\'image de couverture');
    }
    return { url: parcours.image_couverture, titre: parcours.titre };
  }

  async findOneForDownloadMedia(id: number): Promise<{ url: string; titre: string }> {
    const parcours = await this.findOne(id);
    if (!parcours) {
      throw new NotFoundException('Parcours introuvable');
    }
    if (parcours.type_media !== 'image') {
      throw new BadRequestException('Ce parcours n\'est pas de type Image');
    }
    if (!parcours.lien_video) { // In Image mode, lien_video holds the image URL
      throw new NotFoundException('Ce parcours n\'a pas de contenu image associé');
    }
    return { url: parcours.lien_video, titre: parcours.titre };
  }

  async findOneForLink(id: number): Promise<{ link: string }> {
    const parcours = await this.findOne(id);
    if (!parcours) {
      throw new NotFoundException('Parcours introuvable');
    }
    if (parcours.type_media !== 'video') {
      throw new BadRequestException('Ce parcours n\'est pas de type Vidéo');
    }
    if (!parcours.lien_video) {
      throw new NotFoundException('Ce parcours n\'a pas de lien vidéo associé');
    }
    return { link: parcours.lien_video };
  }
}