import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permissions/permissions.guard';
import { Permissions } from 'src/auth/permissions/permissions.decorator';
import { Permission } from 'src/auth/permissions/permission.enum';
import { FilieresExamenService } from './filieres-examen.service';
import { CreateFiliereExamenDto } from './dto/create-filiere-examen.dto';
import { UpdateFiliereExamenDto } from './dto/update-filiere-examen.dto';
import { FiliereExamenQueryDto } from './dto/filiere-examen-query.dto';
import { FiliereExamen } from './entities/filiere-examen.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('filieres-examen')
@Controller('filieres-examen')
export class FilieresExamenController {
  constructor(private readonly filieresExamenService: FilieresExamenService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.REFERENTIALS_CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Créer une nouvelle filière d'examen" })
  @ApiResponse({ status: 201, description: 'Filière créée avec succès', type: FiliereExamen })
  async create(@CurrentCountry() pays: string, @Body() createDto: CreateFiliereExamenDto): Promise<FiliereExamen> {
    return await this.filieresExamenService.create(pays, createDto);
  }

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les filières d'examen" })
  @ApiResponse({ status: 200, description: 'Filières récupérées avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type_examen', required: false, type: Number, description: "Filtrer par ID du type d'examen parent" })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@CurrentCountry() pays: string, @Query() query: FiliereExamenQueryDto) {
    return await this.filieresExamenService.findAll(pays, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Récupérer une filière d'examen par son ID" })
  @ApiResponse({ status: 200, type: FiliereExamen })
  @ApiResponse({ status: 404, description: 'Filière non trouvée' })
  async findOne(@Param('id') id: string): Promise<FiliereExamen> {
    return await this.filieresExamenService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.REFERENTIALS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mettre à jour une filière d'examen" })
  @ApiResponse({ status: 200, type: FiliereExamen })
  @ApiResponse({ status: 404, description: 'Filière non trouvée' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateFiliereExamenDto): Promise<FiliereExamen> {
    return await this.filieresExamenService.update(+id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.REFERENTIALS_DELETE)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer une filière d'examen" })
  @ApiResponse({ status: 204, description: 'Filière supprimée avec succès' })
  @ApiResponse({ status: 404, description: 'Filière non trouvée' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.filieresExamenService.remove(+id);
  }
}
