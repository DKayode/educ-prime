import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreditRewardSourceDto } from '../user-payment/dto/credit-reward-source.dto';
import { CreditRewardSourceUseCase } from '../user-payment/use-cases/credit-reward-source.use-case';
import { InternalApiKeyGuard } from './exam-reward-internal.controller';

@ApiTags('internal-rewards')
@UseGuards(InternalApiKeyGuard)
@Controller('internal/payment/rewards')
export class RewardInternalController {
  constructor(private readonly creditRewardSource: CreditRewardSourceUseCase) {}

  @Post('credit')
  @ApiHeader({ name: 'x-internal-api-key', required: false, description: 'Clé interne backend à backend' })
  @ApiOperation({ summary: 'Endpoint interne générique pour créditer le wallet selon le type de contenu validé' })
  credit(@Body() dto: CreditRewardSourceDto) {
    return this.creditRewardSource.execute(dto);
  }
}
