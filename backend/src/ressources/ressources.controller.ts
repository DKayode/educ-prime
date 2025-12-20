import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { RessourcesService } from './ressources.service';
import { CreerRessourceDto } from './dto/creer-ressource.dto';
import { MajRessourceDto } from './dto/maj-ressource.dto';
import { RessourceResponseDto } from './dto/ressource-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterRessourceDto } from './dto/filter-ressource.dto';
import { FichiersService } from '../fichiers/fichiers.service';

@Controller('ressources')
export class RessourcesController {
  constructor(
    private readonly ressourcesService: RessourcesService,
    private readonly fichiersService: FichiersService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() creerRessourceDto: CreerRessourceDto) {
    return this.ressourcesService.create(creerRessourceDto, req.user.utilisateurId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() filterDto: FilterRessourceDto) {
    return this.ressourcesService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/telechargement')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { url } = await this.ressourcesService.findOneForDownload(id);
    const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('matiere/:id')
  async findByMatiere(@Param('id') matiereId: string, @Query() paginationDto: PaginationDto) {
    return this.ressourcesService.findByMatiere(matiereId, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('professeur/:id')
  async findByProfesseur(@Param('id') professeurId: string, @Query() paginationDto: PaginationDto) {
    return this.ressourcesService.findByProfesseur(professeurId, paginationDto);
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
}