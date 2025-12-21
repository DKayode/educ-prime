import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PublicitesService } from './publicites.service';
import { CreerPubliciteDto } from './dto/creer-publicite.dto';
import { MajPubliciteDto } from './dto/maj-publicite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterPubliciteDto } from './dto/filter-publicite.dto';
import { FichiersService } from '../fichiers/fichiers.service';

@Controller('publicites')
export class PublicitesController {
    constructor(
        private readonly publicitesService: PublicitesService,
        private readonly fichiersService: FichiersService,
    ) { }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Post()
    async create(@Body() creerPubliciteDto: CreerPubliciteDto) {
        return this.publicitesService.create(creerPubliciteDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(@Query() filterDto: FilterPubliciteDto) {
        return this.publicitesService.findAll(filterDto);
    }

    @UseGuards(JwtAuthGuard)
    @UseGuards(JwtAuthGuard)
    @Get(':id/media')
    async downloadMedia(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        const { url } = await this.publicitesService.findOneForDownloadMedia(id);
        const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(HttpStatus.OK).send(buffer);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/image')
    async downloadImage(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        const { url } = await this.publicitesService.findOneForDownloadImage(id);
        const { buffer, contentType, filename } = await this.fichiersService.downloadFile(url);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(HttpStatus.OK).send(buffer);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.publicitesService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Put(':id')
    async update(@Param('id') id: string, @Body() majPubliciteDto: MajPubliciteDto) {
        return this.publicitesService.update(id, majPubliciteDto);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.publicitesService.remove(id);
    }
}
