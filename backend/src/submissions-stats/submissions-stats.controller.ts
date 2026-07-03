import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { SubmissionsStatsService } from './submissions-stats.service';
import { SubmissionsStatsQueryDto } from './dto/submissions-stats-query.dto';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsStatsController {
  constructor(private readonly submissionsStatsService: SubmissionsStatsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Statistiques des demandes d'approbation (épreuves + concours), scopées par pays",
  })
  @ApiResponse({ status: 200, description: 'Comptes par statut, taux d’approbation, à compléter et série journalière' })
  async getStats(@CurrentCountry() pays: string, @Query() query: SubmissionsStatsQueryDto) {
    return this.submissionsStatsService.getStats(pays, query.startDate, query.endDate);
  }
}
