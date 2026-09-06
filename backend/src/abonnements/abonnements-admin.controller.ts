import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { AbonnementsService } from './abonnements.service';
import { ActiverAbonnementDto } from './dto/activer-abonnement.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { FilterAbonnementDto } from './dto/filter-abonnement.dto';
import { ProlongerAbonnementDto } from './dto/prolonger-abonnement.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('abonnements-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleType.ADMIN)
@Controller('admin/abonnements')
export class AbonnementsAdminController {
  constructor(
    private readonly abonnementsService: AbonnementsService,
    private readonly plansService: PlansService,
  ) {}

  // ── Plans ────────────────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({ summary: 'Tous les plans du pays, ouverts comme fermés' })
  plans(@CurrentCountry() pays: string) {
    return this.plansService.findAll(pays);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Créer un plan' })
  creerPlan(@CurrentCountry() pays: string, @Body() dto: CreatePlanDto) {
    return this.plansService.create(pays, dto);
  }

  @Put('plans/:uuid')
  @ApiOperation({ summary: 'Modifier un plan (y compris son ouverture)' })
  modifierPlan(@Param('uuid') uuid: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(uuid, dto);
  }

  @Delete('plans/:uuid')
  @ApiOperation({
    summary: 'Fermer un plan',
    description:
      'Suppression logique : un plan référencé par un abonnement ne peut pas disparaître ' +
      'sans emporter l’historique.',
  })
  fermerPlan(@Param('uuid') uuid: string) {
    return this.plansService.desactiver(uuid);
  }

  // ── Abonnements ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Lister les abonnements (filtres statut, plan, recherche)' })
  liste(@CurrentCountry() pays: string, @Query() filtre: FilterAbonnementDto) {
    return this.abonnementsService.findAll(pays, filtre);
  }

  @Get(':uuid/evenements')
  @ApiOperation({ summary: 'Journal d’un abonnement' })
  evenements(@Param('uuid') uuid: string) {
    return this.abonnementsService.historique(uuid);
  }

  @Post(':uuid/activer')
  @ApiOperation({
    summary: 'Activer un abonnement encaissé hors application',
    description:
      'Chemin de secours tant que #248 n’est pas livrée, et utile ensuite : webhook perdu, ' +
      'paiement en espèces, geste commercial.',
  })
  activer(@Param('uuid') uuid: string, @Body() dto: ActiverAbonnementDto, @Request() req) {
    return this.abonnementsService.activer(uuid, dto, req.user?.utilisateurId);
  }

  @Post(':uuid/prolonger')
  @ApiOperation({ summary: 'Prolonger un abonnement actif' })
  prolonger(@Param('uuid') uuid: string, @Body() dto: ProlongerAbonnementDto) {
    return this.abonnementsService.prolonger(uuid, dto);
  }

  @Post(':uuid/annuler')
  @ApiOperation({ summary: 'Annuler un abonnement' })
  annuler(@Param('uuid') uuid: string, @Body() body: { motif?: string }) {
    return this.abonnementsService.annuler(uuid, body?.motif);
  }
}
