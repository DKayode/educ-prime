import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { EpreuvesService } from './epreuves.service';
import { CreerEpreuveDto } from './dto/creer-epreuve.dto';
import { MajEpreuveDto } from './dto/maj-epreuve.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('epreuves')
export class EpreuvesController {
  constructor(private readonly epreuvesService: EpreuvesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() creerEpreuveDto: CreerEpreuveDto) {
    return this.epreuvesService.create(creerEpreuveDto, req.user.utilisateurId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.epreuvesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.epreuvesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majEpreuveDto: MajEpreuveDto) {
    return this.epreuvesService.update(id, majEpreuveDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.epreuvesService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('matiere/:id')
  async findByMatiere(@Param('id') matiereId: string) {
    return this.epreuvesService.findByMatiere(matiereId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('professeur/:id')
  async findByProfesseur(@Param('id') professeurId: string) {
    return this.epreuvesService.findByProfesseur(professeurId);
  }
}