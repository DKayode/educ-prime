import { FilterUtilisateurDto } from './dto/filter-utilisateur.dto';
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Query, Patch, UseInterceptors, UploadedFile, Res, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UtilisateursService } from './utilisateurs.service';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { UpdateProfilDto } from './dto/update-profil.dto';
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
  @ApiQuery({ name: 'sort_by', required: false, type: String, description: 'Champ de tri (ex: date_creation, filleuls)' })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'], description: 'Ordre de tri' })
  async findAll(@Query() filterDto: FilterUtilisateurDto) {
    return this.utilisateursService.findAll(filterDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profil')
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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post('backfill-referral-codes')
  @ApiOperation({ summary: 'Générer des codes de parrainage pour les utilisateurs existants qui n\'en ont pas (Admin)' })
  @ApiResponse({ status: 200, description: 'Backfill terminé' })
  async backfillReferralCodes() {
    return this.utilisateursService.generateMissingReferralCodes();
  }

  @UseGuards(JwtAuthGuard)
  @Get('code-parrainage')
  @ApiOperation({ summary: 'Récupérer son propre code de parrainage' })
  @ApiResponse({ status: 200, description: 'Code récupéré avec succès' })
  async getMyReferralCode(@Request() req) {
    const userId = req.user.utilisateurId;
    return this.utilisateursService.getReferralCode(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  @ApiOperation({ summary: 'Mettre à jour son propre profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour avec succès' })
  async updateProfile(@Request() req, @Body() updateProfilDto: UpdateProfilDto) {
    const userId = req.user.utilisateurId;
    return this.utilisateursService.update(userId, updateProfilDto);
  }

  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProfilDto: UpdateProfilDto) {
    return this.utilisateursService.update(id, updateProfilDto);
  }

  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un utilisateur (Soft Delete)' })
  async remove(@Param('id') id: string) {
    await this.utilisateursService.softDelete(parseInt(id));
    return { message: 'Utilisateur supprimé avec succès. Il sera définitivement effacé dans 30 jours.' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @ApiOperation({ summary: 'Supprimer son propre compte (Soft Delete)' })
  @ApiResponse({ status: 200, description: 'Compte marqué pour suppression' })
  async removeSelf(@Request() req) {
    const userId = req.user.utilisateurId;
    await this.utilisateursService.softDelete(userId);
    return { message: 'Compte supprimé avec succès. Il sera définitivement effacé dans 30 jours.' };
  }

  @Patch('me/update/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour son propre token FCM' })
  async updateMyFcmToken(
    @Request() req: any,
    @Body() updateDto: any,
  ) {
    const userId = req.user.utilisateurId
    const updatedUser = await this.utilisateursService.updateFcmToken(
      userId,
      updateDto.token,
    );

    return {
      success: true,
      message: 'Votre token FCM a été mis à jour',
      hasToken: !!updatedUser.fcm_token,
    };

  }
  @UseGuards(JwtAuthGuard)
  @Patch('photo')
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
  @Get('photo')
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