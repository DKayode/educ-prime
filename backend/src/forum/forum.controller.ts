import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Res, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ForumService } from './forum.service';
import { CreateForumDto } from './dto/create-forum.dto';
import { FilterForumDto } from './dto/filter-forum.dto';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOkResponse, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { ForumEntity } from './entities/forum.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Forums')
@Controller('forums')
export class ForumController {
    constructor(private readonly forumService: ForumService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Créer un nouveau forum' })
    @ApiResponse({ status: 201, description: 'Le forum a été créé avec succès.', type: ForumEntity })
    @ApiResponse({ status: 401, description: 'Non autorisé.' })
    create(@Body() createForumDto: CreateForumDto, @Req() req) {
        const userId = req.user.utilisateurId;
        return this.forumService.create(createForumDto, userId);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer la liste des forums' })
    @ApiResponse({ status: 200, description: 'Liste des forums récupérée avec succès.', type: [ForumEntity] })
    findAll(@Query() filterDto: FilterForumDto, @Req() req) {
        const userId = req.user.utilisateurId;
        return this.forumService.findAll(filterDto, userId);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer un forum par ID' })
    @ApiParam({ name: 'id', description: 'ID du forum' })
    @ApiResponse({ status: 200, description: 'Le forum a été trouvé.', type: ForumEntity })
    @ApiResponse({ status: 404, description: 'Forum introuvable.' })
    findOne(@Param('id') id: string, @Req() req) {
        const userId = req.user.utilisateurId;
        return this.forumService.findOne(+id, userId);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Supprimer un forum' })
    @ApiParam({ name: 'id', description: 'ID du forum à supprimer' })
    @ApiResponse({ status: 200, description: 'Le forum et ses dépendances (likes, commentaires) ont été supprimés.' })
    @ApiResponse({ status: 404, description: 'Forum introuvable.' })
    remove(@Param('id') id: string) {
        return this.forumService.remove(+id);
    }

    @Post(':id/photo')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Uploader une photo pour le forum' })
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
    @ApiResponse({ status: 201, description: 'Photo uploadée avec succès.' })
    @ApiResponse({ status: 400, description: 'Fichier invalide (type ou taille).' })
    @ApiResponse({ status: 404, description: 'Forum introuvable.' })
    async uploadPhoto(
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
                ],
            }),
        ) file: Express.Multer.File,
        @Req() req
    ) {
        const userId = req.user.utilisateurId;
        return this.forumService.uploadPhoto(+id, file, userId);
    }

    @Get(':id/photo')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Récupérer la photo du forum' })
    @ApiParam({ name: 'id', description: 'ID du forum' })
    @ApiResponse({ status: 200, description: 'Fichier photo récupéré avec succès.' })
    @ApiResponse({ status: 404, description: 'Photo ou Forum introuvable.' })
    async getPhoto(@Param('id') id: string, @Res() res) {
        try {
            const { buffer, contentType, filename } = await this.forumService.getPhoto(+id);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.send(buffer);
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    }
}
