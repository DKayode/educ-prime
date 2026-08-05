import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MatieresExamenService } from './matieres-examen.service';
import { CreateMatiereExamenDto } from './dto/create-matiere-examen.dto';
import { UpdateMatiereExamenDto } from './dto/update-matiere-examen.dto';
import { MatiereExamenQueryDto } from './dto/matiere-examen-query.dto';
import { MatiereExamen } from './entities/matiere-examen.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('matieres-examen')
@Controller('matieres-examen')
export class MatieresExamenController {
  constructor(private readonly matieresExamenService: MatieresExamenService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une nouvelle matière d'examen" })
  @ApiResponse({ status: 201, description: 'Matière créée avec succès', type: MatiereExamen })
  async create(@CurrentCountry() pays: string, @Body() createDto: CreateMatiereExamenDto): Promise<MatiereExamen> {
    return await this.matieresExamenService.create(pays, createDto);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les matières d'examen" })
  @ApiResponse({ status: 200, description: 'Matières récupérées avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type_examen', required: false, type: Number, description: "Filtrer par ID du type d'examen parent" })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@CurrentCountry() pays: string, @Query() query: MatiereExamenQueryDto) {
    return await this.matieresExamenService.findAll(pays, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Récupérer une matière d'examen par son ID" })
  @ApiResponse({ status: 200, type: MatiereExamen })
  @ApiResponse({ status: 404, description: 'Matière non trouvée' })
  async findOne(@Param('id') id: string): Promise<MatiereExamen> {
    return await this.matieresExamenService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour une matière d'examen" })
  @ApiResponse({ status: 200, type: MatiereExamen })
  @ApiResponse({ status: 404, description: 'Matière non trouvée' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateMatiereExamenDto): Promise<MatiereExamen> {
    return await this.matieresExamenService.update(+id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer une matière d'examen" })
  @ApiResponse({ status: 204, description: 'Matière supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Matière non trouvée' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.matieresExamenService.remove(+id);
  }
}
