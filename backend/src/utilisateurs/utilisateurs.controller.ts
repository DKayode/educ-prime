import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { InscriptionDto } from './dto/inscription.dto';
import { MajUtilisateurDto } from './dto/maj-utilisateur.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  @Post('inscription')
  async inscription(@Body() inscriptionDto: InscriptionDto) {
    return this.utilisateursService.inscription(inscriptionDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.utilisateursService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.utilisateursService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() majUtilisateurDto: MajUtilisateurDto) {
    return this.utilisateursService.update(id, majUtilisateurDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.utilisateursService.remove(id);
  }
}