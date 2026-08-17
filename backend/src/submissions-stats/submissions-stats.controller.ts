import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permission.enum';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { SubmissionsStatsService } from './submissions-stats.service';
import { SubmissionsStatsQueryDto } from './dto/submissions-stats-query.dto';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsStatsController {
  constructor(private readonly submissionsStatsService: SubmissionsStatsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.STATS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Statistiques des demandes d'approbation (épreuves + concours), scopées par pays",
  })
  @ApiResponse({ status: 200, description: 'Comptes par statut, taux d’approbation, à compléter et série journalière' })
  async getStats(@CurrentCountry() pays: string, @Query() query: SubmissionsStatsQueryDto) {
    return this.submissionsStatsService.getStats(pays, query.startDate, query.endDate);
  }
}
