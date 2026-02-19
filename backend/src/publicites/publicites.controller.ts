import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
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

@ApiTags('publicites')
@Controller('publicites')
export class PublicitesController {
    constructor(
        private readonly publicitesService: PublicitesService,
        private readonly fichiersService: FichiersService,
    ) { }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Post()
    @ApiOperation({ summary: 'Créer une publicité', description: 'Crée une nouvelle publicité avec possibilité d\'inclure un lien_inscription optionnel.' })
    @ApiResponse({ status: 201, description: 'Publicité créée avec succès.' })
    async create(@Body() creerPubliciteDto: CreerPubliciteDto) {
        return this.publicitesService.create(creerPubliciteDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'Récupérer la liste des publicités' })
    @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
    @ApiQuery({ name: 'titre', required: false, type: String, description: 'Filtrer par titre' })
    async findAll(@Query() filterDto: FilterPubliciteDto) {
        return this.publicitesService.findAll(filterDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/media')
    @ApiOperation({ summary: 'Obtenir l\'image réelle de la publicité', description: 'Récupérer l\'image du contenu (media) si la publicité est de type Image. Pour une publicité Vidéo, cette route renverra une erreur.' })
    @ApiResponse({ status: 200, description: 'Le fichier image a été téléchargé avec succès.' })
    @ApiResponse({ status: 400, description: 'La publicité n\'est pas de type Image ou le fichier n\'existe pas.' })
    @ApiResponse({ status: 404, description: 'Publicité non trouvée.' })
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
    @Get(':id/lien')
    @ApiOperation({ summary: 'Obtenir le lien de la publicité vidéo', description: 'Récupérer le lien d\'une publicité si elle est de type Vidéo.' })
    @ApiResponse({ status: 200, description: 'Le lien de la vidéo a été récupéré avec succès.' })
    @ApiResponse({ status: 400, description: 'La publicité n\'est pas de type Vidéo.' })
    @ApiResponse({ status: 404, description: 'Publicité non trouvée ou lien manquant.' })
    async getLink(@Param('id') id: string) {
        return this.publicitesService.findOneForLink(id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/image')
    @ApiOperation({ summary: 'Obtenir l\'image de couverture de la publicité', description: 'Permet de récupérer (généralement télécharger) l\'image de couverture associée à la publicité.' })
    @ApiResponse({ status: 200, description: 'L\'image de couverture a été téléchargée avec succès.' })
    @ApiResponse({ status: 400, description: 'La publicité ne possède pas d\'image de couverture associée.' })
    @ApiResponse({ status: 404, description: 'Publicité non trouvée.' })
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
    @ApiOperation({ summary: 'Récupérer une publicité', description: 'Renvoie les détails de la publicité (y compris lien_inscription le cas échéant).' })
    @ApiResponse({ status: 200, description: 'Détails de la publicité.' })
    @ApiResponse({ status: 404, description: 'Publicité non trouvée.' })
    async findOne(@Param('id') id: string) {
        return this.publicitesService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Put(':id')
    @ApiOperation({ summary: 'Mettre à jour une publicité', description: 'Permet de modifier les informations d\'une publicité existante, telles que le titre, l\'image ou le lien_inscription.' })
    @ApiResponse({ status: 200, description: 'Publicité mise à jour avec succès.' })
    @ApiResponse({ status: 404, description: 'Publicité non trouvée.' })
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
