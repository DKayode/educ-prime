import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { NiveauEtudeService } from './niveau-etude.service';
import { CreerNiveauEtudeDto } from './dto/creer-niveau-etude.dto';
import { MajNiveauEtudeDto } from './dto/maj-niveau-etude.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('niveau-etude')
export class NiveauEtudeController {
  constructor(private readonly niveauEtudeService: NiveauEtudeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() creerNiveauEtudeDto: CreerNiveauEtudeDto) {
    return this.niveauEtudeService.create(creerNiveauEtudeDto);
  }

  @Get()
  async findAll() {
    return this.niveauEtudeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
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

  @Get('filiere/:id')
  async findByFiliere(@Param('id') filiereId: string) {
    return this.niveauEtudeService.findByFiliere(filiereId);
  }
}