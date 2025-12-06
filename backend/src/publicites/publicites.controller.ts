import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { PublicitesService } from './publicites.service';
import { CreerPubliciteDto } from './dto/creer-publicite.dto';
import { MajPubliciteDto } from './dto/maj-publicite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

@Controller('publicites')
export class PublicitesController {
    constructor(private readonly publicitesService: PublicitesService) { }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Post()
    async create(@Body() creerPubliciteDto: CreerPubliciteDto) {
        return this.publicitesService.create(creerPubliciteDto);
    }

    @Get()
    async findAll() {
        return this.publicitesService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.publicitesService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Put(':id')
    async update(@Param('id') id: string, @Body() majPubliciteDto: MajPubliciteDto) {
        return this.publicitesService.update(id, majPubliciteDto);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.publicitesService.remove(id);
    }
}
