import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Query, Patch, UseInterceptors, UploadedFile, Res, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilterUtilisateurDto } from './dto/filter-utilisateur.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from './entities/utilisateur.entity';
import { OwnerOrAdminGuard } from '../auth/guards/owner-or-admin.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('utilisateurs')
@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) { }

  @Post('inscription')
  async inscription(@Body() inscriptionDto: InscriptionDto) {
    return this.utilisateursService.inscription(inscriptionDto);
  }



  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche globale (nom ou email)' })
  @ApiQuery({ name: 'role', required: false, enum: RoleType, description: 'Filtrer par rôle' })
  async findAll(@Query() filterDto: FilterUtilisateurDto) {
    return this.utilisateursService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Récupérer le profil utilisateur (JSON)' })
  async getProfil(@Request() req) {
    const userId = req.user.utilisateurId.toString();
    const email = req.user.email;
    console.log(`[UtilisateursController] Récupération du profil pour l'utilisateur: ${email} (ID: ${userId})`);
    return this.utilisateursService.findOne(userId);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur (Admin)' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  async create(@Body() inscriptionDto: InscriptionDto) {
    return this.utilisateursService.inscription(inscriptionDto);
  }

  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majUtilisateurDto: MajUtilisateurDto) {
    return this.utilisateursService.update(id, majUtilisateurDto);
  }

  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.utilisateursService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profil')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Mettre à jour ma photo de profil' })
  @ApiResponse({ status: 200, description: 'Photo mise à jour avec succès' })
  async uploadPhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.utilisateurId.toString();
    return this.utilisateursService.uploadPhoto(userId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profil')
  @ApiOperation({ summary: 'Récupérer ma photo de profil' })
  @ApiResponse({ status: 200, description: 'Photo récupérée avec succès' })
  @ApiResponse({ status: 404, description: 'Photo non trouvée' })
  async getPhoto(
    @Request() req,
    @Res() res: any
  ) {
    const userId = req.user.utilisateurId.toString();
    const { buffer, contentType, filename } = await this.utilisateursService.downloadPhoto(userId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.status(HttpStatus.OK).send(buffer);
  }
}