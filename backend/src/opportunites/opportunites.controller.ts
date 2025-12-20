import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { OpportunitesService } from './opportunites.service';
import { CreerOpportuniteDto } from './dto/create-opportunite.dto';
import { UpdateOpportuniteDto } from './dto/update-opportunite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { FilterOpportuniteDto } from './dto/filter-opportunite.dto';
import { FichiersService } from '../fichiers/fichiers.service';

@Controller('opportunites')
export class OpportunitesController {
  constructor(
    private readonly opportunitesService: OpportunitesService,
    private readonly fichiersService: FichiersService,
  ) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  create(@Body() creerOpportuniteDto: CreerOpportuniteDto) {
    return this.opportunitesService.create(creerOpportuniteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() filterDto: FilterOpportuniteDto) {
    return this.opportunitesService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/telechargement')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { url } = await this.opportunitesService.findOneForDownload(+id);
    const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }


  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.opportunitesService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateOpportuniteDto: UpdateOpportuniteDto) {
    return this.opportunitesService.update(+id, updateOpportuniteDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.opportunitesService.remove(+id);
  }
}
