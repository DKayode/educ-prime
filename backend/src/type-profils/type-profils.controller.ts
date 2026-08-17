import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { TypeProfilsService } from './type-profils.service';
import { CreateTypeProfilDto } from './dto/create-type-profil.dto';
import { UpdateTypeProfilDto } from './dto/update-type-profil.dto';
import { FilterTypeProfilDto } from './dto/filter-type-profil.dto';
import { SetEntityTypeProfilDto } from './dto/set-entity-type-profil.dto';

@ApiTags('type-profils')
@Controller('type-profils')
export class TypeProfilsController {
    constructor(private readonly typeProfilsService: TypeProfilsService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @Post()
    @ApiOperation({ summary: 'Créer un type de profil' })
    @ApiResponse({ status: 201, description: 'Type de profil créé avec succès' })
    create(@CurrentCountry() pays: string, @Body() createTypeProfilDto: CreateTypeProfilDto) {
        return this.typeProfilsService.create(pays, createTypeProfilDto);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get()
    @ApiOperation({ summary: 'Récupérer la liste des types de profil' })
    @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
    findAll(@CurrentCountry() pays: string, @Query() filterDto: FilterTypeProfilDto) {
        return this.typeProfilsService.findAll(pays, filterDto);
    }

    // REGISTRE entité ↔ type de profil. Déclaré AVANT :id pour ne pas capter 'registry'.
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('registry')
    @ApiOperation({ summary: 'Registre : type de profil associé à chaque entité (audience)' })
    getRegistry(@CurrentCountry() pays: string) {
        return this.typeProfilsService.getRegistry(pays);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @Put('registry')
    @ApiOperation({ summary: "Remplacer la liste des types de profil d'une entité (audience)" })
    setRegistry(@CurrentCountry() pays: string, @Body() dto: SetEntityTypeProfilDto) {
        return this.typeProfilsService.setAssociations(pays, dto.entity, dto.type_profil_ids ?? []);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get(':uuid/entities')
    @ApiOperation({ summary: 'Entités de contenu associées à un type de profil (par uuid)' })
    getEntities(@CurrentCountry() pays: string, @Param('uuid') uuid: string) {
        return this.typeProfilsService.getEntitiesForTypeProfil(pays, uuid);
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un type de profil par son ID' })
    @ApiResponse({ status: 200, description: 'Type de profil récupéré avec succès' })
    @ApiResponse({ status: 404, description: 'Type de profil non trouvé' })
    findOne(@CurrentCountry() pays: string, @Param('id') id: string) {
        return this.typeProfilsService.findOne(pays, +id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @Put(':id')
    @ApiOperation({ summary: 'Mettre à jour un type de profil' })
    @ApiResponse({ status: 200, description: 'Type de profil mis à jour avec succès' })
    @ApiResponse({ status: 404, description: 'Type de profil non trouvé' })
    update(
        @CurrentCountry() pays: string,
        @Param('id') id: string,
        @Body() updateTypeProfilDto: UpdateTypeProfilDto,
    ) {
        return this.typeProfilsService.update(pays, +id, updateTypeProfilDto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RoleType.ADMIN)
    @ApiBearerAuth()
    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un type de profil' })
    @ApiResponse({ status: 200, description: 'Type de profil supprimé avec succès' })
    @ApiResponse({ status: 404, description: 'Type de profil non trouvé' })
    remove(@CurrentCountry() pays: string, @Param('id') id: string) {
        return this.typeProfilsService.remove(pays, +id);
    }
}
