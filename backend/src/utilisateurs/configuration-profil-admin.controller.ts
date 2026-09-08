import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { UpdateConfigurationProfilDto } from './dto/update-configuration-profil.dto';
import { ProfilCompletionService } from './profil-completion.service';
import { RoleType } from './entities/utilisateur.entity';

@ApiTags('profil-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleType.ADMIN)
@Controller('admin/profil-completion')
export class ConfigurationProfilAdminController {
  constructor(private readonly profilCompletion: ProfilCompletionService) {}

  @Get()
  @ApiOperation({ summary: 'Seuil de complétion exigé et champs comptés' })
  reglages(@CurrentCountry() pays: string) {
    return this.profilCompletion.reglages(pays);
  }

  @Put()
  @ApiOperation({
    summary: 'Régler le seuil',
    description: 'Prend effet immédiatement. Consultez la distribution avant d’activer.',
  })
  modifier(@CurrentCountry() pays: string, @Body() dto: UpdateConfigurationProfilDto) {
    return this.profilCompletion.modifierReglage(pays, dto);
  }

  @Get('distribution')
  @ApiOperation({
    summary: 'Combien de comptes passeraient à chaque seuil',
    description:
      'À regarder AVANT d’activer : sans ce chiffre, rien n’empêche de fixer un seuil qui ' +
      'coupe le service à la totalité des utilisateurs.',
  })
  distribution(@CurrentCountry() pays: string) {
    return this.profilCompletion.distribution(pays);
  }
}
