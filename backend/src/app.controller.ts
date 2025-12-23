import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RoleGuard } from './auth/guards/role.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { RoleType } from './utilisateurs/entities/utilisateur.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getApiInfo(): object {
    return this.appService.getApiInfo();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RoleGuard)
  async getStats() {
    return this.appService.getStats();
  }
}