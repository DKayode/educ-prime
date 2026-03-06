import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { entite_type_enum } from '@prisma/client';
import { TypesService } from './types.service';
import { CreateTypeDto, UpdateTypeDto } from './dto/type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@ApiTags('types')
@Controller('types')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TypesController {
    constructor(private readonly typesService: TypesService) { }

    @Get()
    @ApiOperation({ summary: 'Récupérer tous les types (paginé)' })
    @ApiQuery({ name: 'entite_type', required: false, enum: entite_type_enum })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @Query('entite_type') entite_type?: entite_type_enum,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.typesService.findAll({
            entite_type,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un type par id' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.typesService.findOne(id);
    }

    @Post()
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Créer un nouveau type (Admin)' })
    @ApiResponse({ status: 201, description: 'Type créé avec succès.' })
    @ApiResponse({ status: 409, description: 'Le slug est déjà utilisé.' })
    create(@Body() createTypeDto: CreateTypeDto) {
        return this.typesService.create(createTypeDto);
    }

    @Put(':id')
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Mettre à jour un type (Admin)' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTypeDto: UpdateTypeDto
    ) {
        return this.typesService.update(id, updateTypeDto);
    }

    @Delete(':id')
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Supprimer un type (Admin)' })
    @ApiResponse({ status: 403, description: 'Interdit : des entités y sont rattachées.' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.typesService.remove(id);
    }
}
