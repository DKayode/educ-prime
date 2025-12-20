import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from './entities/utilisateur.entity';
import { OwnerOrAdminGuard } from '../auth/guards/owner-or-admin.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

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
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.utilisateursService.findAll(paginationDto);
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
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.utilisateursService.findOne(id);
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
}