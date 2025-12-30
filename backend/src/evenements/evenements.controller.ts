import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { EvenementsService } from './evenements.service';
import { CreerEvenementDto } from './dto/create-evenement.dto';
import { UpdateEvenementDto } from './dto/update-evenement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FichiersService } from '../fichiers/fichiers.service';
import { FilterEvenementDto } from './dto/filter-evenement.dto';

@ApiTags('evenements')
@Controller('evenements')
export class EvenementsController {
  constructor(
    private readonly evenementsService: EvenementsService,
    private readonly fichiersService: FichiersService,
  ) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  create(@Body() creerEvenementDto: CreerEvenementDto) {
    return this.evenementsService.create(creerEvenementDto);
  }



  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des événements' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  findAll(@Query() filterDto: FilterEvenementDto) {
    return this.evenementsService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/telechargement')
  async downloadFile(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { url } = await this.evenementsService.findOneForDownload(+id);
    const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }

  @Get(':id/image')
  async viewImage(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    try {
      const { url } = await this.evenementsService.findOneForDownload(+id);
      const { buffer, contentType } = await this.fichiersService.downloadFile(url);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.status(HttpStatus.OK).send(buffer);
    } catch (error) {
      console.error('Error serving image for event %s:', id, error);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message,
        error: error.name || 'Internal Server Error',
        details: error
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evenementsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateEvenementDto: UpdateEvenementDto) {
    return this.evenementsService.update(+id, updateEvenementDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evenementsService.remove(+id);
  }
}
