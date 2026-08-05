import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ExamensNationauxService } from './examens-nationaux.service';
import { CreateExamenNationalDto } from './dto/create-examen-national.dto';
import { UpdateExamenNationalDto } from './dto/update-examen-national.dto';
import { FilterExamenNationalDto } from './dto/filter-examen-national.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('examens-nationaux')
@Controller('examens-nationaux')
export class ExamensNationauxController {
    constructor(private readonly service: ExamensNationauxService) { }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Post()
    @ApiOperation({ summary: 'Créer un examen national (Admin). Titre composé côté serveur.' })
    create(@CurrentCountry() pays: string, @Body() dto: CreateExamenNationalDto) {
        return this.service.create(pays, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: 'Lister les examens nationaux' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'type_examen', required: false, type: Number, description: "Filtrer par type d'examen (id)" })
    @ApiQuery({ name: 'serie', required: false, type: Number, description: 'Filtrer par série (id)' })
    @ApiQuery({ name: 'matiere_examen', required: false, type: Number, description: 'Filtrer par matière (id)' })
    @ApiQuery({ name: 'filiere_examen', required: false, type: Number, description: 'Filtrer par filière (id)' })
    @ApiQuery({ name: 'annee', required: false, type: Number })
    findAll(@CurrentCountry() pays: string, @Query() filterDto: FilterExamenNationalDto) {
        return this.service.findAll(pays, filterDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('annees')
    getAnnees(@CurrentCountry() pays: string) {
        return this.service.getAnnees(pays);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateExamenNationalDto) {
        return this.service.update(+id, dto);
    }

    @UseGuards(JwtAuthGuard, RoleGuard)
    @Roles(RoleType.ADMIN)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }
}
