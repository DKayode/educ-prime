import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DepartementService } from './departement.service';
import { CreerDepartementDto } from './dto/creer-departement.dto';
import { MajDepartementDto } from './dto/maj-departement.dto';
import { FilterDepartementDto } from './dto/filter-departement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('departements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departements')
export class DepartementController {
  constructor(private readonly departementService: DepartementService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un département' })
  async create(
    @CurrentCountry() pays: string,
    @Body() dto: CreerDepartementDto,
  ) {
    return this.departementService.create(pays, dto);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importer des départements via CSV (colonnes: nom,code). Scope via ?country=' })
  async importCsv(
    @CurrentCountry() pays: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.departementService.importCsv(pays, file);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les départements' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  async findAll(
    @CurrentCountry() pays: string,
    @Query() filterDto: FilterDepartementDto,
  ) {
    return this.departementService.findAll(pays, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un département par son ID' })
  async findOne(@CurrentCountry() pays: string, @Param('id') id: string) {
    return this.departementService.findOne(pays, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un département' })
  async update(
    @CurrentCountry() pays: string,
    @Param('id') id: string,
    @Body() dto: MajDepartementDto,
  ) {
    return this.departementService.update(pays, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un département' })
  async remove(@CurrentCountry() pays: string, @Param('id') id: string) {
    return this.departementService.remove(pays, id);
  }
}
