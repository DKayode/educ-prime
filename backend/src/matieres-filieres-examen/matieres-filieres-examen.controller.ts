import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MatieresFilieresExamenService } from './matieres-filieres-examen.service';
import { CreateMatiereFiliereExamenDto } from './dto/create-matiere-filiere-examen.dto';
import { UpdateMatiereFiliereExamenDto } from './dto/update-matiere-filiere-examen.dto';
import { MatiereFiliereExamenQueryDto } from './dto/matiere-filiere-examen-query.dto';
import { MatiereFiliereExamen } from './entities/matiere-filiere-examen.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('matieres-filieres-examen')
@Controller('matieres-filieres-examen')
export class MatieresFilieresExamenController {
  constructor(
    private readonly matieresFilieresExamenService: MatieresFilieresExamenService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une nouvelle matière/filière d\'examen' })
  @ApiResponse({
    status: 201,
    description: 'Matière/filière créée avec succès',
    type: MatiereFiliereExamen,
  })
  async create(
    @CurrentCountry() pays: string,
    @Body() createDto: CreateMatiereFiliereExamenDto,
  ): Promise<MatiereFiliereExamen> {
    return await this.matieresFilieresExamenService.create(pays, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les matières/filières d\'examen' })
  @ApiResponse({ status: 200, description: 'Matières/filières récupérées avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'type_examen', required: false, type: Number, description: "Filtrer par ID du type d'examen parent" })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche par nom' })
  async findAll(
    @CurrentCountry() pays: string,
    @Query() query: MatiereFiliereExamenQueryDto,
  ) {
    return await this.matieresFilieresExamenService.findAll(pays, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une matière/filière d\'examen par son ID' })
  @ApiResponse({
    status: 200,
    description: 'Matière/filière récupérée avec succès',
    type: MatiereFiliereExamen,
  })
  @ApiResponse({ status: 404, description: 'Matière/filière non trouvée' })
  async findOne(@Param('id') id: string): Promise<MatiereFiliereExamen> {
    return await this.matieresFilieresExamenService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une matière/filière d\'examen' })
  @ApiResponse({
    status: 200,
    description: 'Matière/filière mise à jour avec succès',
    type: MatiereFiliereExamen,
  })
  @ApiResponse({ status: 404, description: 'Matière/filière non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMatiereFiliereExamenDto,
  ): Promise<MatiereFiliereExamen> {
    return await this.matieresFilieresExamenService.update(+id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une matière/filière d\'examen' })
  @ApiResponse({ status: 204, description: 'Matière/filière supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Matière/filière non trouvée' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.matieresFilieresExamenService.remove(+id);
  }
}
