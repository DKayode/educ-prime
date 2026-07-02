import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { KpiService } from './kpi.service';
import { KpiQueryDto } from './dto/kpi-query.dto';

@ApiTags('kpi')
@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Indicateurs (KPI) sur une période, scopés par pays' })
  @ApiResponse({ status: 200, description: 'Les 15 indicateurs groupés par section' })
  async getKpis(@CurrentCountry() pays: string, @Query() query: KpiQueryDto) {
    return this.kpiService.getKpis(pays, query.startDate, query.endDate);
  }
}
