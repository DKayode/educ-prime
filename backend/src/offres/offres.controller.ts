import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, Query, UseGuards, Request, Patch, UseInterceptors, UploadedFile, Res, HttpStatus, ParseFilePipe, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { OffresService } from './offres.service';
import { CreateOffreDto, UpdateOffreDto, UpdateOffreStatusDto } from './dto/offre.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { TypeContratEnum } from '../common/enums/type-contrat.enum';
import { SetTypeProfilsDto } from '../common/dto/set-type-profils.dto';

@ApiTags('offres')
@Controller('offres')
export class OffresController {
    constructor(private readonly offresService: OffresService) { }

    @Get()
    @ApiOperation({ summary: 'Récupérer la liste des offres actives' })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'prixMin', required: false, type: Number })
    @ApiQuery({ name: 'prixMax', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'type_contrat', required: false, enum: TypeContratEnum })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @CurrentCountry() pays: string,
        @Request() req,
        @Query('type') type?: string,
        @Query('prixMin') prixMin?: string,
        @Query('prixMax') prixMax?: string,
        @Query('search') search?: string,
        @Query('type_contrat') type_contrat?: TypeContratEnum,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        // Route PUBLIQUE (non gardée) : req.user est undefined → on passe un viewer
        // TRUTHY {role:undefined,utilisateurId:undefined} (jamais undefined) pour que
        // l'anonyme ne voie que les offres non-taguées, sans court-circuiter le filtre.
        const viewer = { role: req.user?.role, utilisateurId: req.user?.utilisateurId };
        return this.offresService.findAll(pays, {
            type,
            prixMin: prixMin ? parseFloat(prixMin) : undefined,
            prixMax: prixMax ? parseFloat(prixMax) : undefined,
            search,
            type_contrat,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        }, viewer);
    }

    @Get('user')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer les offres de l\'utilisateur connecté' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllByUser(
        @CurrentCountry() pays: string,
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const userId = req.user.utilisateurId;
        const viewer = { role: req.user?.role, utilisateurId: userId };
        return this.offresService.findAllByUser(pays, userId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        }, viewer);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer toutes les offres (Admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllAdmin(
        @CurrentCountry() pays: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.offresService.findAllAdmin(pays, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Get(':id/type-profils')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer la checklist de types de profil d\'une offre (admin)' })
    getTypeProfils(@Param('id', ParseIntPipe) id: number) {
        return this.offresService.getTypeProfilIds(id);
    }

    @Put(':id/type-profils')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Définir (replace-set) la checklist de types de profil d\'une offre (admin)' })
    setTypeProfils(@Param('id', ParseIntPipe) id: number, @Body() dto: SetTypeProfilsDto) {
        return this.offresService.setTypeProfilIds(id, dto.typeProfilIds);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer une offre par son ID' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.offresService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Créer une offre (Nécessite connexion)' })
    create(@CurrentCountry() pays: string, @Request() req, @Body() createOffreDto: CreateOffreDto) {
        return this.offresService.create(pays, req.user.utilisateurId, createOffreDto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mettre à jour une offre (Nécessite connexion)' })
    update(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateOffreDto: UpdateOffreDto
    ) {
        return this.offresService.update(id, req.user.utilisateurId, updateOffreDto);
    }

    @Put(':id/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mettre à jour le statut d\'une offre (Admin uniquement)' })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStatusDto: UpdateOffreStatusDto
    ) {
        return this.offresService.updateStatus(id, updateStatusDto.status);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Supprimer une offre (Nécessite connexion)' })
    remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
        return this.offresService.remove(id, req.user.utilisateurId, req.user.role);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Patch(':id/image-couverture')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOperation({ summary: 'Mettre à jour l\'image de couverture de l\'offre' })
    @ApiResponse({ status: 200, description: 'Image de couverture mise à jour avec succès' })
    async uploadImageCouverture(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            }),
        ) file: Express.Multer.File,
    ) {
        const userId = req.user.utilisateurId;
        return this.offresService.uploadImageCouverture(id, userId, file);
    }

    @Get(':id/image-couverture')
    @ApiOperation({ summary: 'Récupérer l\'image de couverture de l\'offre' })
    @ApiResponse({ status: 200, description: 'Image de couverture récupérée avec succès' })
    @ApiResponse({ status: 404, description: 'Image non trouvée' })
    async getImageCouverture(
        @Param('id', ParseIntPipe) id: number,
        @Res() res: any
    ) {
        const { buffer, contentType, filename } = await this.offresService.downloadImageCouverture(id);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.status(HttpStatus.OK).send(buffer);
    }
}
