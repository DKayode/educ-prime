import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RessourcesService } from './ressources.service';
import { CreerRessourceDto } from './dto/creer-ressource.dto';
import { MajRessourceDto } from './dto/maj-ressource.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ressources')
export class RessourcesController {
  constructor(private readonly ressourcesService: RessourcesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() creerRessourceDto: CreerRessourceDto) {
    return this.ressourcesService.create(creerRessourceDto, req.user.utilisateurId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.ressourcesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ressourcesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majRessourceDto: MajRessourceDto) {
    return this.ressourcesService.update(id, majRessourceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.ressourcesService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('matiere/:id')
  async findByMatiere(@Param('id') matiereId: string) {
    return this.ressourcesService.findByMatiere(matiereId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('professeur/:id')
  async findByProfesseur(@Param('id') professeurId: string) {
    return this.ressourcesService.findByProfesseur(professeurId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('type/:type')
  async findByType(@Param('type') type: string) {
    return this.ressourcesService.findByType(type);
  }
}