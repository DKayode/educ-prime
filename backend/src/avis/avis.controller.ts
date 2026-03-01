import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { AvisService } from './avis.service';
import { CreateAvisDto, UpdateAvisDto } from './dto/avis.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('avis')
@Controller('avis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AvisController {
    constructor(private readonly avisService: AvisService) { }

    @Post()
    @ApiOperation({ summary: 'Créer un avis sur un service.' })
    @ApiResponse({
        status: 201, description: 'L\'avis a été créé.'
    })
    create(@Request() req, @Body() createAvisDto: CreateAvisDto) {
        const userId = req.user.utilisateurId;
        return this.avisService.create(userId, createAvisDto);
    }

    @Get('service/:serviceId')
    @ApiOperation({
        summary: 'Récupérer les avis d\'un service (avec les commentaires associés)'
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllByService(
        @Param('serviceId', ParseIntPipe) serviceId: number,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.avisService.findAllByService(serviceId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Put(':id')
    @ApiOperation({ summary: 'Mettre à jour un avis et/ou son commentaire' })
    update(
        @Request() req,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateAvisDto: UpdateAvisDto
    ) {
        const userId = req.user.utilisateurId;
        return this.avisService.update(id, userId, updateAvisDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Supprimer un avis' })
    remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
        const userId = req.user.utilisateurId;
        return this.avisService.remove(id, userId);
    }
}
