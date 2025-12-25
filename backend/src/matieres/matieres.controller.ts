import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MatieresService } from './matieres.service';
import { CreerMatiereDto } from './dto/creer-matiere.dto';
import { MajMatiereDto } from './dto/maj-matiere.dto';
import { MatiereResponseDto } from './dto/matiere-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterMatiereDto } from './dto/filter-matiere.dto';

@ApiTags('matieres')
@Controller('matieres')
export class MatieresController {
  constructor(private readonly matieresService: MatieresService) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN, RoleType.PROFESSEUR)
  @Post()
  async create(@Body() creerMatiereDto: CreerMatiereDto) {
    return this.matieresService.create(creerMatiereDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des matières' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des matières' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale (nom matière, nom niveau, nom filière)' })
  @ApiQuery({ name: 'filiere', required: false, type: String, description: 'Filtrer par nom de filière' })
  async findAll(@Query() filterDto: FilterMatiereDto) {
    return this.matieresService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MatiereResponseDto> {
    return this.matieresService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN, RoleType.PROFESSEUR)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majMatiereDto: MajMatiereDto) {
    return this.matieresService.update(id, majMatiereDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN, RoleType.PROFESSEUR)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.matieresService.remove(id);
  }

}