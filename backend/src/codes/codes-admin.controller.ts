import { Body, Controller, Delete, Get, Header, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CodesService } from './codes.service';
import { CreateCodeDto } from './dto/create-code.dto';
import { FilterCodesDto } from './dto/filter-codes.dto';
import { GenererCampagneDto } from './dto/generer-campagne.dto';
import { UpdateCodeDto } from './dto/update-code.dto';

@ApiTags('codes-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleType.ADMIN)
@Controller('admin/codes')
export class CodesAdminController {
  constructor(private readonly codesService: CodesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les codes',
    description:
      'Sans filtre de type, les codes de PARRAINAGE sont exclus : générés à l’inscription, ' +
      'ils noieraient le catalogue promo sous des dizaines de milliers de lignes.',
  })
  liste(@CurrentCountry() pays: string, @Query() filtre: FilterCodesDto) {
    return this.codesService.findAll(pays, filtre);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un code — cas « un code, n utilisations »' })
  creer(@CurrentCountry() pays: string, @Body() dto: CreateCodeDto, @Request() req) {
    return this.codesService.create(pays, dto, req.user?.utilisateurId);
  }

  @Put(':uuid')
  @ApiOperation({ summary: 'Modifier un code' })
  modifier(@Param('uuid') uuid: string, @Body() dto: UpdateCodeDto) {
    return this.codesService.update(uuid, dto);
  }

  @Delete(':uuid')
  @ApiOperation({
    summary: 'Désactiver un code',
    description: 'Suppression logique : un code déjà utilisé garde son historique.',
  })
  desactiver(@Param('uuid') uuid: string) {
    return this.codesService.desactiver(uuid);
  }

  @Get(':uuid/utilisations')
  @ApiOperation({ summary: 'Qui a utilisé ce code, et pour quelle remise' })
  utilisations(@Param('uuid') uuid: string) {
    return this.codesService.utilisationsDuCode(uuid);
  }

  // ── Campagnes ────────────────────────────────────────────────────────────

  @Get('campagnes/liste')
  @ApiOperation({ summary: 'Campagnes du pays, avec le nombre de codes générés et utilisés' })
  campagnes(@CurrentCountry() pays: string) {
    return this.codesService.campagnesList(pays);
  }

  @Post('campagnes')
  @ApiOperation({
    summary: 'Générer n codes uniques à usage unique',
    description: 'Le second cas de l’issue : n codes, une utilisation chacun, pour n personnes.',
  })
  genererCampagne(@CurrentCountry() pays: string, @Body() dto: GenererCampagneDto, @Request() req) {
    return this.codesService.genererCampagne(pays, dto, req.user?.utilisateurId);
  }

  @Get('campagnes/:uuid/export')
  @ApiOperation({ summary: 'Export CSV des codes d’une campagne, pour distribution' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="codes.csv"')
  exporter(@Param('uuid') uuid: string) {
    return this.codesService.exporterCampagne(uuid);
  }
}
