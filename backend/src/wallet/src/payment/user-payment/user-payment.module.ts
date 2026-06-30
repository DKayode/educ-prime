import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { WalletModule } from '../wallet/wallet.module';
import { UserPaymentController } from './user-payment.controller';
import { ExamRewardInternalController, InternalApiKeyGuard } from './exam-reward-internal.controller';
import { UpsertPaymentAccountUseCase } from './use-cases/upsert-payment-account.use-case';
import { GetPaymentAccountsUseCase } from './use-cases/get-payment-accounts.use-case';
import {
  ApproveWithdrawalUseCase,
  ConfirmManualPaymentUseCase,
  GetPaymentConfigurationUseCase,
  ListAdminWithdrawalsUseCase,
  RejectWithdrawalUseCase,
  UpdatePaymentConfigurationUseCase,
} from './use-cases/admin-withdrawal.use-cases';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_EXECUTION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../shared/payment.tokens';
import {
  TypeOrmPaymentAuditLogAdapter,
  TypeOrmPaymentConfigurationRepository,
  TypeOrmPaymentExecutionRepository,
  TypeOrmUserPaymentAccountRepository,
  TypeOrmWithdrawalRequestRepository,
} from '../infrastructure/typeorm-payment.repositories';
import { FirebaseFcmPaymentNotificationAdapter } from '../infrastructure/firebase-fcm-payment-notification.adapter';
import * as paymentEntities from '../payment.entities';

@Module({
  imports: [TypeOrmModule.forFeature(Object.values(paymentEntities) as any[]), ConfigModule, WalletModule, FirebaseModule],
  controllers: [UserPaymentController, ExamRewardInternalController],
  providers: [
    InternalApiKeyGuard,
    UpsertPaymentAccountUseCase,
    GetPaymentAccountsUseCase,
    ListAdminWithdrawalsUseCase,
    ApproveWithdrawalUseCase,
    RejectWithdrawalUseCase,
    ConfirmManualPaymentUseCase,
    GetPaymentConfigurationUseCase,
    UpdatePaymentConfigurationUseCase,
    { provide: USER_PAYMENT_ACCOUNT_REPOSITORY, useClass: TypeOrmUserPaymentAccountRepository },
    { provide: WITHDRAWAL_REQUEST_REPOSITORY, useClass: TypeOrmWithdrawalRequestRepository },
    { provide: PAYMENT_EXECUTION_REPOSITORY, useClass: TypeOrmPaymentExecutionRepository },
    { provide: PAYMENT_CONFIGURATION_REPOSITORY, useClass: TypeOrmPaymentConfigurationRepository },
    { provide: PAYMENT_AUDIT_LOG_PORT, useClass: TypeOrmPaymentAuditLogAdapter },
    { provide: PAYMENT_NOTIFICATION_PORT, useClass: FirebaseFcmPaymentNotificationAdapter },
  ],
  exports: [UpsertPaymentAccountUseCase, ConfirmManualPaymentUseCase],
})
export class UserPaymentModule {}
