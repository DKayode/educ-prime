import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { NiveauEtudeService } from './niveau-etude.service';
import { CreerNiveauEtudeDto } from './dto/creer-niveau-etude.dto';
import { MajNiveauEtudeDto } from './dto/maj-niveau-etude.dto';
import { NiveauEtudeResponseDto } from './dto/niveau-etude-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterNiveauEtudeDto } from './dto/filter-niveau-etude.dto';

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
  async findAll(@Query() filterDto: FilterNiveauEtudeDto) {
    return this.niveauEtudeService.findAll(filterDto);
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
  @Get('filiere/:id')
  async findByFiliere(@Param('id') filiereId: string) {
    return this.niveauEtudeService.findByFiliere(filiereId);
  }
}