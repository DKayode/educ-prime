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
import { RewardSourceTypeCode, WithdrawalStatus } from '../shared/payment.enums';
import { UpsertPaymentAccountDto } from './dto/upsert-payment-account.dto';
import { ConfirmManualPaymentDto } from './dto/confirm-manual-payment.dto';
import { UpdatePaymentConfigurationDto } from './dto/update-payment-configuration.dto';
import { CancelWithdrawalDto } from './dto/cancel-withdrawal.dto';
import { CurrentCountry } from '../../common/decorators/current-country.decorator';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';
import { UnlockWithdrawalOtpDto } from './dto/unlock-withdrawal-otp.dto';
import { UpdateRewardConfigurationDto } from './dto/update-reward-configuration.dto';
import { UpsertPaymentAccountUseCase } from './use-cases/upsert-payment-account.use-case';
import { GetPaymentAccountsUseCase } from './use-cases/get-payment-accounts.use-case';
import { GetUserPaymentActivityUseCase } from './use-cases/get-user-payment-activity.use-case';
import {
  GetRewardConfigurationUseCase,
  ListRewardConfigurationsUseCase,
  UpdateRewardConfigurationUseCase,
} from './use-cases/admin-reward-configuration.use-cases';
import {
  ApproveWithdrawalUseCase,
  ConfirmManualPaymentUseCase,
  GetPaymentConfigurationUseCase,
  GetWithdrawalOtpDeliveryStatusUseCase,
  ListAdminWithdrawalsUseCase,
  CancelWithdrawalUseCase,
  RejectWithdrawalUseCase,
  UnlockWithdrawalOtpUseCase,
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
    private readonly getWithdrawalOtpDeliveryStatus: GetWithdrawalOtpDeliveryStatusUseCase,
    private readonly approveWithdrawal: ApproveWithdrawalUseCase,
    private readonly rejectWithdrawal: RejectWithdrawalUseCase,
    private readonly cancelWithdrawal: CancelWithdrawalUseCase,
    private readonly unlockWithdrawalOtp: UnlockWithdrawalOtpUseCase,
    private readonly confirmManualPayment: ConfirmManualPaymentUseCase,
    private readonly getConfiguration: GetPaymentConfigurationUseCase,
    private readonly updateConfiguration: UpdatePaymentConfigurationUseCase,
    private readonly getUserPaymentActivity: GetUserPaymentActivityUseCase,
    private readonly listRewardConfigurations: ListRewardConfigurationsUseCase,
    private readonly getRewardConfiguration: GetRewardConfigurationUseCase,
    private readonly updateRewardConfiguration: UpdateRewardConfigurationUseCase,
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
    @CurrentCountry() pays: string,
    @Query('status') status?: WithdrawalStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listAdminWithdrawals.execute(
      pays,
      status,
      Number(page ?? 1),
      Number(limit ?? 20),
    );
  }


  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Get('admin/withdrawals/:id/otp-delivery-status')
  @ApiOperation({
    summary: 'Diagnostiquer le statut de livraison OTP Infobip d’une demande de retrait',
  })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  getWithdrawalOtpDeliveryStatusDetails(@Param('id') id: string) {
    return this.getWithdrawalOtpDeliveryStatus.execute(id);
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
  @Patch('admin/withdrawals/:id/cancel')
  @ApiOperation({
    summary: "Annuler une demande de retrait restée en attente de code OTP",
    description:
      "Libère l'utilisateur, qui peut aussitôt déposer une nouvelle demande. Le motif lui est transmis. Réservé aux demandes en OTP_PENDING : une demande déjà validée se rejette.",
  })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait' })
  cancel(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CancelWithdrawalDto,
  ) {
    return this.cancelWithdrawal.execute(id, req.user.utilisateurId, dto.reason);
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch('admin/withdrawals/:id/unlock-otp')
  @ApiOperation({
    summary: 'Débloquer une demande de retrait bloquée après échecs OTP',
  })
  @ApiParam({ name: 'id', description: 'Identifiant de la demande de retrait bloquée en vérification sécurité' })
  unlockOtp(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UnlockWithdrawalOtpDto,
  ) {
    return this.unlockWithdrawalOtp.execute({
      withdrawalRequestId: id,
      adminId: req.user.utilisateurId,
      reason: dto.reason,
      verificationMethod: dto.verificationMethod,
      allowNewOtp: dto.allowNewOtp ?? true,
    });
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
  @Get('admin/reward-configurations')
  @ApiOperation({
    summary: 'Lister les configurations de récompense par type de contenu : EPREUVE, EXAMEN, CONCOURS',
  })
  listRewardConfigurationDetails() {
    return this.listRewardConfigurations.execute();
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Get('admin/reward-configurations/:sourceType')
  @ApiOperation({
    summary: 'Consulter la configuration de récompense d’un type de contenu',
  })
  @ApiParam({ name: 'sourceType', enum: RewardSourceTypeCode, example: RewardSourceTypeCode.EPREUVE })
  getRewardConfigurationDetails(@Param('sourceType') sourceType: string) {
    return this.getRewardConfiguration.execute(sourceType);
  }

  @UseGuards(RoleGuard)
  @Roles(RoleType.ADMIN)
  @Patch('admin/reward-configurations/:sourceType')
  @ApiOperation({
    summary: 'Mettre à jour la configuration de récompense d’un type de contenu',
  })
  @ApiParam({ name: 'sourceType', enum: RewardSourceTypeCode, example: RewardSourceTypeCode.CONCOURS })
  updateRewardConfigurationDetails(
    @Request() req,
    @Param('sourceType') sourceType: string,
    @Body() dto: UpdateRewardConfigurationDto,
  ) {
    return this.updateRewardConfiguration.execute(sourceType, req.user.utilisateurId, dto);
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
