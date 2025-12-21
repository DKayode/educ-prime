import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { FilieresService } from './filieres.service';
import { CreerFiliereDto } from './dto/creer-filiere.dto';
import { MajFiliereDto } from './dto/maj-filiere.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterFiliereDto } from './dto/filter-filiere.dto';

@Controller('filieres')
export class FilieresController {
  constructor(private readonly filieresService: FilieresService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() creerFiliereDto: CreerFiliereDto) {
    return this.filieresService.create(creerFiliereDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() filterDto: FilterFiliereDto) {
    return this.filieresService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.filieresService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majFiliereDto: MajFiliereDto) {
    return this.filieresService.update(id, majFiliereDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.filieresService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('etablissement/:id')
  async findByEtablissement(@Param('id') etablissementId: string) {
    return this.filieresService.findByEtablissement(etablissementId);
  }
}