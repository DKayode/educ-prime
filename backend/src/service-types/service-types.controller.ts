import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ServiceTypesService } from './service-types.service';
import { CreateServiceTypeDto, UpdateServiceTypeDto } from './dto/service-types.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@ApiTags('service-types')
@Controller('service-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServiceTypesController {
    constructor(private readonly serviceTypesService: ServiceTypesService) { }

    @Get()
    @ApiOperation({ summary: 'Récupérer tous les types de services' })
    findAll() {
        return this.serviceTypesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un type de service par id' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.serviceTypesService.findOne(id);
    }

    @Post()
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Créer un nouveau type de service (Admin)' })
    @ApiResponse({ status: 201, description: 'Type de service créé avec succès.' })
    @ApiResponse({ status: 409, description: 'Le slug est déjà utilisé.' })
    create(@Body() createServiceTypeDto: CreateServiceTypeDto) {
        return this.serviceTypesService.create(createServiceTypeDto);
    }

    @Put(':id')
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Mettre à jour un type de service (Admin)' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateServiceTypeDto: UpdateServiceTypeDto
    ) {
        return this.serviceTypesService.update(id, updateServiceTypeDto);
    }

    @Delete(':id')
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Supprimer un type de service (Admin)' })
    @ApiResponse({ status: 403, description: 'Interdit : des services y sont rattachés.' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.serviceTypesService.remove(id);
    }
}
