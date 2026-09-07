import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { ConfirmerPaiementDto } from './dto/confirmer-paiement.dto';
import { FilterPaiementsDto } from './dto/filter-paiements.dto';
import { RembourserPaiementDto } from './dto/rembourser-paiement.dto';
import { PaiementsService } from './paiements.service';

@ApiTags('paiements-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleType.ADMIN)
@Controller('admin/paiements')
export class PaiementsAdminController {
  constructor(private readonly paiements: PaiementsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les paiements entrants' })
  liste(@CurrentCountry() pays: string, @Query() filtre: FilterPaiementsDto) {
    return this.paiements.adminList(pays, filtre);
  }

  @Post(':uuid/confirmer')
  @ApiOperation({ summary: 'Confirmer manuellement un paiement vérifié hors webhook' })
  confirmer(@CurrentCountry() pays: string, @Param('uuid') uuid: string, @Body() dto: ConfirmerPaiementDto) {
    return this.paiements.confirmerManuellement(pays, uuid, dto);
  }

  @Post(':uuid/resynchroniser')
  @ApiOperation({ summary: 'Resynchroniser le statut auprès du prestataire' })
  resynchroniser(@CurrentCountry() pays: string, @Param('uuid') uuid: string) {
    return this.paiements.resynchroniser(pays, uuid);
  }

  @Post(':uuid/rembourser')
  @ApiOperation({ summary: 'Marquer un paiement réussi comme remboursé' })
  rembourser(@CurrentCountry() pays: string, @Param('uuid') uuid: string, @Body() dto: RembourserPaiementDto) {
    return this.paiements.rembourser(pays, uuid, dto);
  }
}
