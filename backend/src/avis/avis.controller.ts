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
    @ApiOperation({ summary: 'Créer un avis sur un service ou une offre (polymorphique).' })
    @ApiResponse({
        status: 201, description: 'L\'avis a été créé.'
    })
    create(@Request() req, @Body() createAvisDto: CreateAvisDto) {
        const userId = req.user.utilisateurId;
        return this.avisService.create(userId, createAvisDto);
    }

    @Get(':model/:id')
    @ApiOperation({
        summary: 'Récupérer les avis d\'une entité (Services ou Offres)'
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    findAllByModel(
        @Param('model') model: string,
        @Param('id', ParseIntPipe) id: number,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.avisService.findAllByModel(model, id, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }

    @Put(':id')
    @ApiOperation({ summary: 'Mettre à jour un avis et/ou son comment' })
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
