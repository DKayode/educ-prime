import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Patch, UseInterceptors, UploadedFile, ParseFilePipe, FileTypeValidator, Res, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecruteursService } from './recruteurs.service';
import { CreateRecruteurDto, UpdateRecruteurDto, UpdateRecruteurStatusDto } from './dto/recruteur.dto';
import { FilterRecruteurDto } from './dto/filter-recruteur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@ApiTags('Recruteurs')
@Controller('recruteurs')
export class RecruteursController {
    constructor(private readonly recruteursService: RecruteursService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Créer un nouveau recruteur (Nécessite connexion)' })
    @Post()
    create(@Body() createRecruteurDto: CreateRecruteurDto, @Request() req) {
        const userId = req.user.utilisateurId; // user id should come from jwt payload
        return this.recruteursService.create(createRecruteurDto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Récupérer la liste des recruteurs actifs ou approuvés' })
    findAll() {
        return this.recruteursService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer tous les recruteurs (Admin uniquement)' })
    @ApiQuery({ name: 'sort_by', required: false, type: String, description: 'Champ de tri (ex: date_creation, created_at)' })
    @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'], description: 'Ordre de tri' })
    @Get('all')
    findAllAdmin(@Query() filterDto: FilterRecruteurDto) {
        return this.recruteursService.findAllAdmin(filterDto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer le profil du recruteur connecté' })
    @Get('profil')
    findProfile(@Request() req) {
        const userId = req.user.utilisateurId;
        return this.recruteursService.findProfile(userId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put()
    @ApiOperation({ summary: 'Mettre à jour le profil du recruteur connecté' })
    update(@Request() req, @Body() updateRecruteurDto: UpdateRecruteurDto) {
        const userId = req.user.utilisateurId;
        return this.recruteursService.update(userId, updateRecruteurDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mettre à jour le statut d\'un recruteur (Admin uniquement)' })
    @Put(':id/status')
    updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateRecruteurStatusDto) {
        return this.recruteursService.updateStatus(+id, updateStatusDto.status);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un recruteur' })
    remove(@Param('id') id: string) {
        return this.recruteursService.remove(+id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Patch('photo-profil')
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
    @ApiOperation({ summary: 'Mettre à jour la photo de profil du recruteur' })
    @ApiResponse({ status: 200, description: 'Photo de profil mise à jour avec succès' })
    async uploadPhotoProfil(
        @Request() req,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            }),
        ) file: Express.Multer.File,
    ) {
        const userId = req.user.utilisateurId;
        return this.recruteursService.uploadPhotoProfil(userId, file);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('photo-profil')
    @ApiOperation({ summary: 'Récupérer la photo de profil du recruteur' })
    @ApiResponse({ status: 200, description: 'Photo de profil récupérée avec succès' })
    @ApiResponse({ status: 404, description: 'Photo non trouvée' })
    async getPhotoProfil(
        @Request() req,
        @Res() res: any
    ) {
        const userId = req.user.utilisateurId;
        const { buffer, contentType, filename } = await this.recruteursService.downloadPhotoProfil(userId);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.status(HttpStatus.OK).send(buffer);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Patch('photo-identite')
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
    @ApiOperation({ summary: 'Mettre à jour la photo d\'identité du recruteur' })
    @ApiResponse({ status: 200, description: 'Photo d\'identité mise à jour avec succès' })
    async uploadPhotoIdentite(
        @Request() req,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            }),
        ) file: Express.Multer.File,
    ) {
        const userId = req.user.utilisateurId;
        return this.recruteursService.uploadPhotoIdentite(userId, file);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('photo-identite')
    @ApiOperation({ summary: 'Récupérer la photo d\'identité du recruteur' })
    @ApiResponse({ status: 200, description: 'Photo d\'identité récupérée avec succès' })
    @ApiResponse({ status: 404, description: 'Photo non trouvée' })
    async getPhotoIdentite(
        @Request() req,
        @Res() res: any
    ) {
        const userId = req.user.utilisateurId;
        const { buffer, contentType, filename } = await this.recruteursService.downloadPhotoIdentite(userId);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.status(HttpStatus.OK).send(buffer);
    }
}
