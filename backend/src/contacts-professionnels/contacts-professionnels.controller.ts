import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ContactsProfessionnelsService } from './contacts-professionnels.service';
import { CreerContactsProfessionnelDto } from './dto/create-contacts-professionnel.dto';
import { UpdateContactsProfessionnelDto } from './dto/update-contacts-professionnel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('contacts-professionnels')
@Controller('contacts-professionnels')
export class ContactsProfessionnelsController {
  constructor(private readonly contactsProfessionnelsService: ContactsProfessionnelsService) { }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Post()
  create(@Body() creerContactsProfessionnelDto: CreerContactsProfessionnelDto) {
    return this.contactsProfessionnelsService.create(creerContactsProfessionnelDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des contacts professionnels' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.contactsProfessionnelsService.findAll(paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsProfessionnelsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactsProfessionnelDto: UpdateContactsProfessionnelDto) {
    return this.contactsProfessionnelsService.update(+id, updateContactsProfessionnelDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(RoleType.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsProfessionnelsService.remove(+id);
  }
}
