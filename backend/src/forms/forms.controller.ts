import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreerCampaignDto } from './dto/creer-campaign.dto';
import { MajStatutDto } from './dto/maj-statut.dto';
import { FilterCampaignDto } from './dto/filter-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une campagne (arbre sections + questions)' })
  create(
    @CurrentCountry() pays: string,
    @Body() dto: CreerCampaignDto,
    @Request() req: any,
  ) {
    return this.formsService.create(pays, dto, req.user?.utilisateurId ?? null);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les campagnes' })
  findAll(
    @CurrentCountry() pays: string,
    @Query() filterDto: FilterCampaignDto,
  ) {
    return this.formsService.findAll(pays, filterDto);
  }

  @Get(':uuid')
  @ApiOperation({ summary: "Récupérer une campagne (arbre complet)" })
  findOne(@CurrentCountry() pays: string, @Param('uuid') uuid: string) {
    return this.formsService.findOne(pays, uuid);
  }

  @Get(':uuid/results')
  @ApiOperation({ summary: 'KPI / résultats agrégés d\'une campagne' })
  getResults(@CurrentCountry() pays: string, @Param('uuid') uuid: string) {
    return this.formsService.getResults(pays, uuid);
  }

  @Put(':uuid')
  @ApiOperation({ summary: "Remplacer l'arbre complet d'une campagne" })
  update(
    @CurrentCountry() pays: string,
    @Param('uuid') uuid: string,
    @Body() dto: CreerCampaignDto,
  ) {
    return this.formsService.update(pays, uuid, dto);
  }

  @Patch(':uuid/statut')
  @ApiOperation({ summary: 'Changer le statut (draft/active/archived)' })
  updateStatut(
    @CurrentCountry() pays: string,
    @Param('uuid') uuid: string,
    @Body() dto: MajStatutDto,
  ) {
    return this.formsService.updateStatut(pays, uuid, dto);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Supprimer une campagne' })
  remove(@CurrentCountry() pays: string, @Param('uuid') uuid: string) {
    return this.formsService.remove(pays, uuid);
  }
}
