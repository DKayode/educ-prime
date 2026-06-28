import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus, Version, Request } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConcoursService } from './concours.service';
import { CreateConcoursDto } from './dto/create-concours.dto';
import { UpdateConcoursDto } from './dto/update-concours.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { FilterConcoursDto } from './dto/filter-concours.dto';
import { FichiersService } from '../fichiers/fichiers.service';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('concours')
@Controller('concours')
export class ConcoursController {
  constructor(
    private readonly concoursService: ConcoursService,
    private readonly fichiersService: FichiersService,
  ) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  create(@Body() createConcoursDto: CreateConcoursDto) {
    return this.concoursService.create(createConcoursDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des concours' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche textuelle (Titre ou Lieu)' })
  @ApiQuery({ name: 'annee', required: false, type: Number, description: 'Filtrer par année' })
  @ApiQuery({ name: 'sort_by', required: false, type: String, description: 'Trier par (annee, titre) [Default: titre]' })

  findAll(@Query() filterDto: FilterConcoursDto) {
    return this.concoursService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Concours groupés par titre officiel (structure + titre), instances par année imbriquées' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche sur le titre officiel (structure / titre)' })
  findGroupedV1(
    @CurrentCountry() pays: string,
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ) {
    const isAdmin = req.user?.role === RoleType.ADMIN;
    return this.concoursService.findGroupedByTitle(pays, paginationDto, isAdmin);
  }

  @UseGuards(JwtAuthGuard)
  @Get('annees')
  getAnnees() {
    return this.concoursService.getAnnees();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/telechargement')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { url } = await this.concoursService.findOneForDownload(+id);
    const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.concoursService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateConcoursDto: UpdateConcoursDto) {
    return this.concoursService.update(+id, updateConcoursDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.concoursService.remove(+id);
  }
}
