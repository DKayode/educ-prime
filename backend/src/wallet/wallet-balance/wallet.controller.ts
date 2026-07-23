import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetMyWalletUseCase } from './use-cases/get-my-wallet.use-case';
import { GetMyWalletTransactionsUseCase } from './use-cases/get-my-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { GetCurrentWithdrawalUseCase } from './use-cases/get-current-withdrawal.use-case';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { VerifyWithdrawalOtpDto } from '../otp/dto/verify-withdrawal-otp.dto';
import { VerifyWithdrawalOtpUseCase } from '../otp/use-cases/verify-withdrawal-otp.use-case';
import { ResendWithdrawalOtpUseCase } from '../otp/use-cases/resend-withdrawal-otp.use-case';
import { GetWithdrawalOtpDebugCodeUseCase } from '../otp/use-cases/get-withdrawal-otp-debug-code.use-case';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly getMyWallet: GetMyWalletUseCase,
    private readonly getMyWalletTransactions: GetMyWalletTransactionsUseCase,
    private readonly getCurrentWithdrawal: GetCurrentWithdrawalUseCase,
    private readonly requestWithdrawal: RequestWithdrawalUseCase,
    private readonly verifyWithdrawalOtp: VerifyWithdrawalOtpUseCase,
    private readonly resendWithdrawalOtp: ResendWithdrawalOtpUseCase,
    private readonly getWithdrawalOtpDebugCode: GetWithdrawalOtpDebugCodeUseCase,
  ) { }

  @Get('me')
  @ApiOperation({ summary: 'Consulter uniquement le wallet de l’utilisateur connecté' })
  getMine(@Request() req) {
    return this.getMyWallet.execute(req.user.utilisateurId);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Consulter l’historique paginé des transactions du wallet' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getMyTransactions(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getMyWalletTransactions.execute(req.user.utilisateurId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('withdrawals/current')
  @ApiOperation({ summary: 'Consulter la demande de retrait courante et son statut' })
  getCurrentWithdrawalStatus(@Request() req) {
    return this.getCurrentWithdrawal.execute(req.user.utilisateurId);
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

  @Post('withdrawals/:id/resend-otp')
  @ApiOperation({ summary: 'Renvoyer un code OTP si le SMS n’a pas été reçu ou livré' })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait créée en OTP_PENDING' })
  resendOtp(@Request() req, @Param('id') id: string) {
    return this.resendWithdrawalOtp.execute(req.user.utilisateurId, id);
  }

  @Get('dev/withdrawals/:id/otp')
  @ApiOperation({ summary: 'Route temporaire DEV : consulter le code OTP envoyé pour une demande de retrait' })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  getOtpForDev(@Param('id') id: string) {
    return this.getWithdrawalOtpDebugCode.execute(id);
  }
}
