import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetMyWalletUseCase } from './use-cases/get-my-wallet.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly getMyWallet: GetMyWalletUseCase,
    private readonly requestWithdrawal: RequestWithdrawalUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Consulter son wallet et ses dernières transactions' })
  getMine(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getMyWallet.execute(req.user.utilisateurId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Créer une demande de retrait Mobile Money' })
  createWithdrawal(@Request() req, @Body() dto: RequestWithdrawalDto) {
    return this.requestWithdrawal.execute({ userId: req.user.utilisateurId, ...dto });
  }
}
