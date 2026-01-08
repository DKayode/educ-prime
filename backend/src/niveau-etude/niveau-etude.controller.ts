import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NiveauEtudeService } from './niveau-etude.service';
import { CreerNiveauEtudeDto } from './dto/creer-niveau-etude.dto';
import { MajNiveauEtudeDto } from './dto/maj-niveau-etude.dto';
import { NiveauEtudeResponseDto } from './dto/niveau-etude-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterNiveauEtudeDto } from './dto/filter-niveau-etude.dto';

@ApiTags('niveau-etude')
@Controller('niveau-etude')
export class NiveauEtudeController {
  constructor(private readonly niveauEtudeService: NiveauEtudeService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() creerNiveauEtudeDto: CreerNiveauEtudeDto) {
    return this.niveauEtudeService.create(creerNiveauEtudeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des niveaux d\'étude' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale (nom niveau, nom filière)' })
  @ApiQuery({ name: 'filiere', required: false, type: String, description: 'Filtrer par nom de filière' })
  async findAll(@Query() filterDto: FilterNiveauEtudeDto) {
    return this.niveauEtudeService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('grouper-par-nom')
  @ApiOperation({ summary: 'Récupérer les niveaux groupés par nom avec pagination' })
  async findGroupByName(@Query() paginationDto: PaginationDto) {
    return this.niveauEtudeService.findGroupByName(paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<NiveauEtudeResponseDto> {
    return this.niveauEtudeService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majNiveauEtudeDto: MajNiveauEtudeDto) {
    return this.niveauEtudeService.update(id, majNiveauEtudeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.niveauEtudeService.remove(id);
  }
  @UseGuards(JwtAuthGuard)
  @Delete('grouper-par-nom/:nom')
  async removeGroup(@Param('nom') nom: string) {
    return this.niveauEtudeService.removeGroup(nom);
  }



}