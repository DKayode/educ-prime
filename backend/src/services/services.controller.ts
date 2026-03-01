import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Request, ForbiddenException, ParseIntPipe, Patch } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto, UpdateServiceStatusDto } from './dto/service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { services_status_enum } from '@prisma/client';

@ApiTags('services')
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Post()
    @ApiOperation({ summary: 'Créer un nouveau service' })
    @ApiResponse({ status: 201, description: 'Service créé avec succès.' })
    @ApiResponse({ status: 403, description: 'L\'utilisateur n\'a pas vérifié son email.' })
    create(@Request() req, @Body() createServiceDto: CreateServiceDto) {
        const userId = req.user.utilisateurId;
        return this.servicesService.create(userId, createServiceDto);
    }

    @Get()
    @ApiOperation({ summary: 'Récupérer tous les services actifs' })
    @ApiQuery({ name: 'localisation', required: false, type: String })
    @ApiQuery({ name: 'type', required: false, type: String })
    @ApiQuery({ name: 'tarifMin', required: false, type: Number })
    @ApiQuery({ name: 'tarifMax', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Recherche dans titre et description' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAll(
        @Query('localisation') localisation?: string,
        @Query('type') type?: string,
        @Query('tarifMin') tarifMin?: string,
        @Query('tarifMax') tarifMax?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.servicesService.findAll({
            localisation,
            type,
            tarifMin: tarifMin ? parseFloat(tarifMin) : undefined,
            tarifMax: tarifMax ? parseFloat(tarifMax) : undefined,
            search,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Get('user')
    @ApiOperation({ summary: 'Récupérer les services de l\'utilisateur connecté' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllByUser(
        @Request() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const userId = req.user.utilisateurId;
        return this.servicesService.findAllByUser(userId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Get('all')
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: 'Récupérer tous les services (Admin)' })
    @ApiQuery({ name: 'status', required: false, enum: services_status_enum })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllAdmin(
        @Query('status') status?: services_status_enum,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.servicesService.findAllAdmin({
            status,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Put(':id/status')
    @Roles(RoleType.ADMIN)
    @ApiOperation({ summary: "Modifier le statut d'un service (Admin)" })
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStatusDto: UpdateServiceStatusDto
    ) {
        return this.servicesService.updateStatus(id, updateStatusDto.status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Récupérer un service par id' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.servicesService.findOne(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Mettre à jour un service' })
    update(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateServiceDto: UpdateServiceDto
    ) {
        const userId = req.user.utilisateurId;
        return this.servicesService.update(id, userId, updateServiceDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un service' })
    remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
        const userId = req.user.utilisateurId;
        return this.servicesService.remove(id, userId);
    }

}
