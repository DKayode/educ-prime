import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { EpreuvesService } from './epreuves.service';
import { CreerEpreuveDto } from './dto/creer-epreuve.dto';
import { MajEpreuveDto } from './dto/maj-epreuve.dto';
import { EpreuveResponseDto } from './dto/epreuve-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterEpreuveDto } from './dto/filter-epreuve.dto';
import { FichiersService } from '../fichiers/fichiers.service';

@Controller('epreuves')
export class EpreuvesController {
  constructor(
    private readonly epreuvesService: EpreuvesService,
    private readonly fichiersService: FichiersService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() creerEpreuveDto: CreerEpreuveDto) {
    return this.epreuvesService.create(creerEpreuveDto, req.user.utilisateurId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() filterDto: FilterEpreuveDto) {
    return this.epreuvesService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/telechargement')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { url } = await this.epreuvesService.findOneForDownload(id);
    const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('matiere/:id')
  async findByMatiere(@Param('id') matiereId: string, @Query() paginationDto: PaginationDto) {
    return this.epreuvesService.findByMatiere(matiereId, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('professeur/:id')
  async findByProfesseur(@Param('id') professeurId: string, @Query() paginationDto: PaginationDto) {
    return this.epreuvesService.findByProfesseur(professeurId, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EpreuveResponseDto> {
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
}