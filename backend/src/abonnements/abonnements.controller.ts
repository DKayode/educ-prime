import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AbonnementsService } from './abonnements.service';
import { SouscrireDto } from './dto/souscrire.dto';
import { EntitlementService } from './entitlement.service';
import { PlansService } from './plans.service';

@ApiTags('abonnements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('abonnements')
export class AbonnementsController {
  constructor(
    private readonly abonnementsService: AbonnementsService,
    private readonly plansService: PlansService,
    private readonly entitlement: EntitlementService,
  ) {}

  @Get('plans')
  @ApiOperation({
    summary: 'Catalogue des plans ouverts',
    description:
      'Ne renvoie que les plans actifs. Tant que l’encaissement (#248) n’est pas livré, ' +
      'la liste est volontairement vide : montrer un prix qu’on ne peut pas payer n’aide personne.',
  })
  plans(@CurrentCountry() pays: string) {
    return this.plansService.findActifs(pays);
  }

  @Get('mon-abonnement')
  @ApiOperation({ summary: 'Abonnement courant (actif, sinon en attente), ou null' })
  monAbonnement(@Request() req) {
    return this.abonnementsService.monAbonnement(req.user?.utilisateurId);
  }

  @Get('mes-abonnements')
  @ApiOperation({ summary: 'Historique des abonnements de l’utilisateur' })
  mesAbonnements(@Request() req, @Query() pagination: PaginationDto) {
    return this.abonnementsService.mesAbonnements(req.user?.utilisateurId, pagination);
  }

  @Get('mes-droits')
  @ApiOperation({
    summary: 'Décision de droit par fonctionnalité',
    description:
      'Permet au client de griser son interface AVANT de se prendre un 403. ' +
      '`verrou_actif` dit si le refus est réellement appliqué ou seulement simulé.',
  })
  @ApiResponse({ status: 200, description: 'Une décision par fonctionnalité + l’état du verrou' })
  async mesDroits(@Request() req) {
    return {
      verrou_actif: this.entitlement.verrouActif,
      droits: await this.entitlement.mesDroits(req.user?.utilisateurId, req.user?.role),
    };
  }

  @Post('souscrire')
  @ApiOperation({
    summary: 'Ouvrir un abonnement',
    description:
      'Crée un abonnement EN_ATTENTE. Il devient ACTIF au paiement (#248) ou par ' +
      'activation manuelle d’un administrateur.',
  })
  souscrire(@CurrentCountry() pays: string, @Request() req, @Body() dto: SouscrireDto) {
    return this.abonnementsService.souscrire(pays, req.user?.utilisateurId, dto);
  }
}
