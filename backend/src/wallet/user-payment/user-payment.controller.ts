import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RoleType } from 'src/utilisateurs/entities/utilisateur.entity';
import { WithdrawalStatus } from '../shared/payment.enums';
import { UpsertPaymentAccountDto } from './dto/upsert-payment-account.dto';
import { ConfirmManualPaymentDto } from './dto/confirm-manual-payment.dto';
import { UpdatePaymentConfigurationDto } from './dto/update-payment-configuration.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { UpsertPaymentAccountUseCase } from './use-cases/upsert-payment-account.use-case';
import { GetPaymentAccountsUseCase } from './use-cases/get-payment-accounts.use-case';
import { GetUserPaymentActivityUseCase } from './use-cases/get-user-payment-activity.use-case';
import {
  ApproveWithdrawalUseCase,
  ConfirmManualPaymentUseCase,
  GetPaymentConfigurationUseCase,
  ListAdminWithdrawalsUseCase,
  RejectWithdrawalUseCase,
  UpdatePaymentConfigurationUseCase,
} from './use-cases/admin-withdrawal.use-cases';

@ApiTags('User Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-payment')
export class UserPaymentController {
  constructor(
    private readonly upsertPaymentAccount: UpsertPaymentAccountUseCase,
    private readonly getPaymentAccounts: GetPaymentAccountsUseCase,
    private readonly listAdminWithdrawals: ListAdminWithdrawalsUseCase,
    private readonly approveWithdrawal: ApproveWithdrawalUseCase,
    private readonly rejectWithdrawal: RejectWithdrawalUseCase,
    private readonly confirmManualPayment: ConfirmManualPaymentUseCase,
    private readonly getConfiguration: GetPaymentConfigurationUseCase,
    private readonly updateConfiguration: UpdatePaymentConfigurationUseCase,
    private readonly getUserPaymentActivity: GetUserPaymentActivityUseCase,
  ) { }

  @Post('accounts')
  @ApiOperation({
    summary: 'Créer ou mettre à jour le compte Mobile Money par défaut',
  })
  upsertAccount(@Request() req, @Body() dto: UpsertPaymentAccountDto) {
    return this.upsertPaymentAccount.execute({
      userId: req.user.utilisateurId,
      changedBy: req.user.utilisateurId,
      ...dto,
    });
  }

  @Get('accounts/me')
  @ApiOperation({
    summary: 'Lister les comptes de paiement de l’utilisateur connecté',
  })
  myAccounts(@Request() req) {
    return this.getPaymentAccounts.execute(req.user.utilisateurId);
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Get('admin/withdrawals')
  @ApiOperation({
    summary: 'Lister les demandes de retrait côté administrateur',
  })
  @ApiQuery({ name: 'status', enum: WithdrawalStatus, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  adminWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listAdminWithdrawals.execute(
      status,
      Number(page ?? 1),
      Number(limit ?? 20),
    );
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch('admin/withdrawals/:id/approve')
  @ApiOperation({
    summary: 'Approuver une demande de retrait',
  })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  approve(@Request() req, @Param('id') id: string) {
    return this.approveWithdrawal.execute(id, req.user.utilisateurId);
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch('admin/withdrawals/:id/reject')
  @ApiOperation({
    summary: 'Rejeter une demande de retrait',
  })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  reject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.rejectWithdrawal.execute(
      id,
      req.user.utilisateurId,
      dto.reason,
    );
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch('admin/withdrawals/:id/confirm-payment')
  @ApiOperation({
    summary: 'Confirmer le paiement manuel Mobile Money',
  })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  confirmPayment(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ConfirmManualPaymentDto,
  ) {
    return this.confirmManualPayment.execute({
      withdrawalRequestId: id,
      adminId: req.user.utilisateurId,
      provider: dto.provider,
      transactionReference: dto.transactionReference,
      phoneNumber: dto.phoneNumber,
      paidAmount: dto.paidAmount,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      comment: dto.comment,
      internalNote: dto.internalNote,
      proof: dto.proofFileUrl
        ? {
          fileName: dto.proofFileName ?? 'preuve-paiement',
          fileUrl: dto.proofFileUrl,
          mimeType: dto.proofMimeType ?? 'image/jpeg',
          uploadedBy: req.user.utilisateurId,
        }
        : undefined,
    });
  }



  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Get('admin/users/:userId/payment-activity')
  @ApiOperation({
    summary: 'Consulter toutes les requêtes de paiement/retrait et statistiques d’un utilisateur',
  })
  @ApiParam({ name: 'userId', description: 'Identifiant utilisateur' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  getUserPaymentActivityDetails(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.getUserPaymentActivity.execute(
      Number(userId),
      Number(page ?? 1),
      Number(limit ?? 50),
    );
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Get('admin/configuration')
  @ApiOperation({
    summary: 'Consulter la configuration Wallet et paiement',
  })
  getPaymentConfiguration() {
    return this.getConfiguration.execute();
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch('admin/configuration')
  @ApiOperation({
    summary: 'Mettre à jour la configuration Wallet et paiement',
  })
  updatePaymentConfiguration(
    @Request() req,
    @Body() dto: UpdatePaymentConfigurationDto,
  ) {
    return this.updateConfiguration.execute(req.user.utilisateurId, dto);
  }
}
