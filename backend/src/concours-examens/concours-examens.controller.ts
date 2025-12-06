import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { ConcoursExamensService } from './concours-examens.service';
import { CreerConcoursExamenDto } from './dto/create-concours-examen.dto';
import { UpdateConcoursExamenDto } from './dto/update-concours-examen.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@Controller('concours-examens')
export class ConcoursExamensController {
  constructor(private readonly concoursExamensService: ConcoursExamensService) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  create(@Body() creerConcoursExamenDto: CreerConcoursExamenDto) {
    return this.concoursExamensService.create(creerConcoursExamenDto);
  }

  @Get()
  findAll() {
    return this.concoursExamensService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.concoursExamensService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateConcoursExamenDto: UpdateConcoursExamenDto) {
    return this.concoursExamensService.update(+id, updateConcoursExamenDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.concoursExamensService.remove(+id);
  }
}
