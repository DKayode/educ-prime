import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetMyWalletUseCase } from './use-cases/get-my-wallet.use-case';
import { GetMyWalletTransactionsUseCase } from './use-cases/get-my-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { VerifyWithdrawalOtpDto } from '../otp/dto/verify-withdrawal-otp.dto';
import { VerifyWithdrawalOtpUseCase } from '../otp/use-cases/verify-withdrawal-otp.use-case';
import { GetWithdrawalOtpDebugCodeUseCase } from '../otp/use-cases/get-withdrawal-otp-debug-code.use-case';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly getMyWallet: GetMyWalletUseCase,
    private readonly getMyWalletTransactions: GetMyWalletTransactionsUseCase,
    private readonly requestWithdrawal: RequestWithdrawalUseCase,
    private readonly verifyWithdrawalOtp: VerifyWithdrawalOtpUseCase,
    private readonly getWithdrawalOtpDebugCode: GetWithdrawalOtpDebugCodeUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Consulter son wallet et ses dernières transactions' })
  getMine(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getMyWallet.execute(req.user.utilisateurId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('me/transactions')
  @ApiOperation({ summary: "Historique paginé des transactions du wallet de l'utilisateur connecté" })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getMyTransactions(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getMyWalletTransactions.execute(req.user.utilisateurId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('withdrawals')
  @ApiOperation({ summary: 'Créer une demande de retrait et envoyer le code OTP sur le numéro Mobile Money' })
  createWithdrawal(@Request() req, @Body() dto: RequestWithdrawalDto) {
    return this.requestWithdrawal.execute({ userId: req.user.utilisateurId, ...dto });
  }

  @Post('withdrawals/:id/verify-otp')
  @ApiOperation({ summary: 'Valider le code OTP et soumettre définitivement la demande de retrait' })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait créée en OTP_PENDING' })
  verifyOtp(@Request() req, @Param('id') id: string, @Body() dto: VerifyWithdrawalOtpDto) {
    return this.verifyWithdrawalOtp.execute(req.user.utilisateurId, id, dto.code);
  }

  @Get('dev/withdrawals/:id/otp')
  @ApiOperation({ summary: 'Route temporaire DEV : consulter le code OTP envoyé pour une demande de retrait' })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  getOtpForDev(@Param('id') id: string) {
    return this.getWithdrawalOtpDebugCode.execute(id);
  }
}
