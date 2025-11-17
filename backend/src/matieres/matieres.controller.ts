import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { MatieresService } from './matieres.service';
import { CreerMatiereDto } from './dto/creer-matiere.dto';
import { MajMatiereDto } from './dto/maj-matiere.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@Controller('matieres')
export class MatieresController {
  constructor(private readonly matieresService: MatieresService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN, RoleType.PROFESSEUR)
  @Post()
  async create(@Body() creerMatiereDto: CreerMatiereDto) {
    return this.matieresService.create(creerMatiereDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.matieresService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
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

  @UseGuards(JwtAuthGuard)
  @Get('niveau-etude/:id')
  async findByNiveauEtude(@Param('id') niveauEtudeId: string) {
    return this.matieresService.findByNiveauEtude(niveauEtudeId);
  }
}