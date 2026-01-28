import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { CategoryQueryDto } from './dto/category-query.dto';
import { slugify } from '../utils/slugify';
import { FichiersService } from 'src/fichiers/fichiers.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private fichiersService: FichiersService,
  ) { }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Générer le slug à partir du nom
    const slug = slugify(createCategoryDto.nom);

    // Vérifier si le nom ou le slug existe déjà
    const existingCategory = await this.categoryRepository.findOne({
      where: [{ nom: createCategoryDto.nom }, { slug }],
    });

    if (existingCategory) {
      if (existingCategory.nom === createCategoryDto.nom) {
        throw new BadRequestException(`Une catégorie avec le nom "${createCategoryDto.nom}" existe déjà`);
      }
      throw new BadRequestException(`Une catégorie avec le slug "${slug}" existe déjà`);
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      slug,
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(query: CategoryQueryDto): Promise<{
    data: Category[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10, search, is_active, sort_by = 'ordre', sort_order = 'ASC' } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parcours', 'parcours')
      .loadRelationCountAndMap('category.parcoursCount', 'category.parcours');

    // Appliquer les filtres
    if (search) {
      queryBuilder.where(
        '(unaccent(category.nom) ILIKE unaccent(:search) OR unaccent(category.description) ILIKE unaccent(:search))',
        { search: `%${search}%` }
      );
    }

    if (is_active !== undefined) {
      queryBuilder.andWhere('category.is_active = :is_active', { is_active });
    }

    // Appliquer le tri
    queryBuilder.orderBy(`category.${sort_by}`, sort_order);

    // Pagination
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parcours'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID ${id} non trouvée`);
    }

    // Compter les parcours
    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.parcours', 'parcours')
      .where('category.id = :id', { id })
      .select('COUNT(parcours.id)', 'count')
      .getRawOne();

    const parcoursCount = parseInt(result.count || '0', 10);

    category.parcoursCount = parcoursCount;

    return category;
  }

  async findOneBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['parcours'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec le slug "${slug}" non trouvée`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    // Si le nom est modifié, regénérer le slug
    if (updateCategoryDto.nom && updateCategoryDto.nom !== category.nom) {
      const newSlug = slugify(updateCategoryDto.nom);

      // Vérifier si le nouveau slug existe déjà
      const existingSlug = await this.categoryRepository.findOne({
        where: { slug: newSlug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new BadRequestException(`Une catégorie avec le slug "${newSlug}" existe déjà`);
      }

      updateCategoryDto['slug'] = newSlug;
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async uploadIcon(id: number, file: any, userId: number): Promise<Category> {
    const category = await this.findOne(id);

    // Upload file
    const uploadResult = await this.fichiersService.uploadFile(file, userId, {
      type: 'CATEGORIES' as any, // Typed as any to match Enum in FichiersService if needed, or import Enum
      entityId: id,
    });

    // Update category icon URL
    category.icone = uploadResult.url;
    return await this.categoryRepository.save(category);
  }

  async downloadIcon(id: number): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const category = await this.findOne(id);
    if (!category.icone) {
      throw new NotFoundException(`Aucune icône n'est associée à la catégorie ${id}`);
    }
    return this.fichiersService.downloadFile(category.icone);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);

    // Vérifier si la catégorie contient des parcours
    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.parcours', 'parcours')
      .where('category.id = :id', { id })
      .select('COUNT(parcours.id)', 'count')
      .getRawOne();

    const parcoursCount = parseInt(result.count || '0', 10);

    if (parcoursCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette catégorie car elle contient ${parcoursCount} parcours`
      );
    }

    await this.categoryRepository.remove(category);
  }

  async getStats(): Promise<any> {
    const stats = await this.categoryRepository
      .createQueryBuilder('category')
      .select('category.id', 'id')
      .addSelect('category.nom', 'nom')
      .addSelect('COUNT(parcours.id)', 'parcours_count')
      .leftJoin('category.parcours', 'parcours')
      .groupBy('category.id')
      .orderBy('parcours_count', 'DESC')
      .getRawMany();

    const totalCategories = await this.categoryRepository.count();
    const totalParcours = stats.reduce((sum, stat) => sum + parseInt(stat.parcours_count), 0);

    return {
      total_categories: totalCategories,
      total_parcours: totalParcours,
      categories: stats,
    };
  }
}