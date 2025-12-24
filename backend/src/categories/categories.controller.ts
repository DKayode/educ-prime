import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { CategoryQueryDto } from './dto/category-query.dto';
import { FichiersService } from 'src/fichiers/fichiers.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService, private readonly fichiersService: FichiersService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle catégorie' })
  @ApiResponse({ status: 201, description: 'Catégorie créée avec succès', type: Category })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Catégorie déjà existante' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les catégories' })
  @ApiResponse({ status: 200, description: 'Catégories récupérées avec succès' })
  async findAll(@Query() query: CategoryQueryDto) {
    return await this.categoriesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Récupérer les statistiques des catégories' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return await this.categoriesService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une catégorie par son ID' })
  @ApiResponse({ status: 200, description: 'Catégorie récupérée avec succès', type: Category })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async findOne(@Param('id') id: string): Promise<Category> {
    return await this.categoriesService.findOne(+id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Récupérer une catégorie par son slug' })
  @ApiResponse({ status: 200, description: 'Catégorie récupérée avec succès', type: Category })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  async findOneBySlug(@Param('slug') slug: string): Promise<Category> {
    return await this.categoriesService.findOneBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie mise à jour avec succès', type: Category })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return await this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer (contient des parcours)' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.categoriesService.remove(+id);
  }
}