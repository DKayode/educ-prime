import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Patch, UseInterceptors, UploadedFile, Res, HttpStatus, ParseFilePipe, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrestatairesService } from './prestataires.service';
import { CreatePrestataireDto, UpdatePrestataireDto } from './dto/prestataire.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Assuming this exists based on common NestJS patterns

@ApiTags('Prestataires')
@Controller('prestataires')
export class PrestatairesController {
    constructor(private readonly prestatairesService: PrestatairesService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Créer un nouveau prestataire (Nécessite connexion)' })
    @Post()
    create(@Body() createPrestataireDto: CreatePrestataireDto, @Request() req) {
        const userId = req.user.utilisateurId; // user id should come from jwt payload
        return this.prestatairesService.create(createPrestataireDto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Récupérer la liste de tous les prestataires' })
    findAll() {
        return this.prestatairesService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer le profil du prestataire connecté' })
    @Get('profil')
    findProfile(@Request() req) {
        const userId = req.user.utilisateurId;
        return this.prestatairesService.findProfile(userId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Put()
    @ApiOperation({ summary: 'Mettre à jour le profil du prestataire connecté' })
    update(@Request() req, @Body() updatePrestataireDto: UpdatePrestataireDto) {
        return this.prestatairesService.update(req.user.utilisateurId, updatePrestataireDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un prestataire' })
    remove(@Param('id') id: string) {
        return this.prestatairesService.remove(+id);
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
    @ApiOperation({ summary: 'Mettre à jour la photo de profil du prestataire' })
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
        return this.prestatairesService.uploadPhotoProfil(userId, file);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('photo-profil')
    @ApiOperation({ summary: 'Récupérer la photo de profil du prestataire' })
    @ApiResponse({ status: 200, description: 'Photo de profil récupérée avec succès' })
    @ApiResponse({ status: 404, description: 'Photo non trouvée' })
    async getPhotoProfil(
        @Request() req,
        @Res() res: any
    ) {
        const userId = req.user.utilisateurId;
        const { buffer, contentType, filename } = await this.prestatairesService.downloadPhotoProfil(userId);
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
    @ApiOperation({ summary: 'Mettre à jour la photo d\'identité du prestataire' })
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
        return this.prestatairesService.uploadPhotoIdentite(userId, file);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('photo-identite')
    @ApiOperation({ summary: 'Récupérer la photo d\'identité du prestataire' })
    @ApiResponse({ status: 200, description: 'Photo d\'identité récupérée avec succès' })
    @ApiResponse({ status: 404, description: 'Photo non trouvée' })
    async getPhotoIdentite(
        @Request() req,
        @Res() res: any
    ) {
        const userId = req.user.utilisateurId;
        const { buffer, contentType, filename } = await this.prestatairesService.downloadPhotoIdentite(userId);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.status(HttpStatus.OK).send(buffer);
    }
}
