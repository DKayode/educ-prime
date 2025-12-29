import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Query, Patch } from '@nestjs/common';
import { FilterUtilisateurDto } from './dto/filter-utilisateur.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
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
  @Get('profil')
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
}