import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiHeader } from '@nestjs/swagger';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditWalletFromValidatedExamUseCase } from '../wallet-balance/use-cases/credit-wallet-from-validated-exam.use-case';
import { CreditWalletFromExamDto } from '../wallet-balance/dto/credit-wallet-from-exam.dto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) { }

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('PAYMENT_INTERNAL_API_KEY');
    if (!expected) return true;
    const request = context.switchToHttp().getRequest();
    if (request.headers['x-internal-api-key'] !== expected) throw new UnauthorizedException('Clé interne invalide');
    return true;
  }
}

@ApiTags('internal-exam-rewards')
@ApiHeader({
  name: 'x-internal-api-key',
  required: true,
  description: 'Clé interne de sécurisation de la toute créditant le wallet et autorisant le module de chargement des épreuves payant à créditer le wallet',
  schema: {
    example: 'edukia-internal-secret',
  },
})
@UseGuards(InternalApiKeyGuard)
@Controller('internal/payment/exam-rewards')
export class ExamRewardInternalController {
  constructor(private readonly creditWalletFromValidatedExam: CreditWalletFromValidatedExamUseCase) { }

  @Post('credit')
  @ApiOperation({ summary: 'Endpoint interne appelé par le module de chargement/validation des épreuves' })
  credit(@Body() dto: CreditWalletFromExamDto) {
    return this.creditWalletFromValidatedExam.execute(dto);
  }
}
