import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCountry } from '../common/decorators/current-country.decorator';
import { CodeValidationService } from './code-validation.service';
import { ValiderCodeDto } from './dto/valider-code.dto';
import { PlansService } from '../abonnements/plans.service';

@ApiTags('codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('codes')
export class CodesController {
  constructor(
    private readonly validation: CodeValidationService,
    private readonly plans: PlansService,
  ) {}

  @Post('valider')
  @ApiOperation({
    summary: 'Vérifier un code et calculer la remise, sans le consommer',
    description:
      'Pour l’aperçu avant paiement. Le code est revalidé sous verrou au moment de la ' +
      'souscription : entre l’aperçu et l’achat, un autre acheteur peut avoir pris la ' +
      'dernière place.',
  })
  @ApiResponse({ status: 201, description: 'Toujours 201 : un code refusé n’est pas une erreur HTTP' })
  async valider(
    @CurrentCountry() pays: string,
    @Request() req,
    @Body() dto: ValiderCodeDto,
  ) {
    const plan = dto.plan_uuid ? await this.plans.findByUuid(dto.plan_uuid).catch(() => null) : null;
    return this.validation.valider(dto.code, req.user?.utilisateurId, {
      planId: plan?.id,
      prix: plan?.prix,
      pays,
    });
  }
}
