import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditWalletFromValidatedExamUseCase } from '../wallet-balance/use-cases/credit-wallet-from-validated-exam.use-case';
import { CreditWalletFromExamDto } from '../wallet-balance/dto/credit-wallet-from-exam.dto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('PAYMENT_INTERNAL_API_KEY');
    if (!expected) return true;
    const request = context.switchToHttp().getRequest();
    if (request.headers['x-internal-api-key'] !== expected) throw new UnauthorizedException('Clé interne invalide');
    return true;
  }
}

@ApiTags('internal-exam-rewards')
@UseGuards(InternalApiKeyGuard)
@Controller('internal/payment/exam-rewards')
export class ExamRewardInternalController {
  constructor(private readonly creditWalletFromValidatedExam: CreditWalletFromValidatedExamUseCase) {}

  @Post('credit')
  @ApiHeader({ name: 'x-internal-api-key', required: false, description: 'Clé interne backend à backend' })
  @ApiOperation({ summary: 'Endpoint interne historique pour les épreuves. Conservé pour compatibilité.' })
  credit(@Body() dto: CreditWalletFromExamDto) {
    return this.creditWalletFromValidatedExam.execute(dto);
  }
}
