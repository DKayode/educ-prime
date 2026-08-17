import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { RoleType } from './utilisateurs/entities/utilisateur.entity';
import { CurrentCountryOptional } from './common/decorators/current-country.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  // `pays` is undefined when the caller supplies no ?country= — that means
  // "aggregate across ALL countries". A ?country=<slug> keeps it scoped.
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStats(@CurrentCountryOptional() pays: string | undefined) {
    return this.appService.getStats(pays);
  }
}