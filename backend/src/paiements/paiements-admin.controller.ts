import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { FilterPaiementsDto } from './dto/filter-paiements.dto';
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
}
