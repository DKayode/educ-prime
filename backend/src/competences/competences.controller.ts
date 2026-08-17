import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CompetencesService } from './competences.service';
import { CreateCompetenceDto, UpdateCompetenceDto } from './dto/competence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permission.enum';

@ApiTags('competences')
@Controller('competences')
export class CompetencesController {
    constructor(private readonly competencesService: CompetencesService) { }

    @Get()
    @ApiOperation({ summary: 'Récupérer toutes les compétences (paginé)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.competencesService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une compétence par id' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.competencesService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.REFERENTIALS_CREATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une compétence' })
    create(@Body() createCompetenceDto: CreateCompetenceDto) {
        return this.competencesService.create(createCompetenceDto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.REFERENTIALS_UPDATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour une compétence (Admin)' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCompetenceDto: UpdateCompetenceDto
    ) {
        return this.competencesService.update(id, updateCompetenceDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @Permissions(Permission.REFERENTIALS_DELETE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Supprimer une compétence (Admin)' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.competencesService.remove(id);
    }
}
