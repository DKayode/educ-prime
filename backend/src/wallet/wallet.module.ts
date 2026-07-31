import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { LocalConfigModule } from 'src/config/config.module';
import { UtilisateursModule } from 'src/utilisateurs/utilisateurs.module';

import * as paymentEntities from './payment.entities';
import { WalletController } from './wallet-balance/wallet.controller';
import { UserPaymentController } from './user-payment/user-payment.controller';
import { ExamRewardInternalController, InternalApiKeyGuard } from './internal/exam-reward-internal.controller';
import { InfobipDeliveryReportController, InfobipWebhookGuard } from './otp/infobip-delivery-report.controller';
import { InfobipDeliveryReportController, InfobipWebhookGuard } from './otp/infobip-delivery-report.controller';

import { RuleEngineService } from './shared/rules-engine.service';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_EXECUTION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  USER_PROFILE_PORT,
  OTP_SMS_SENDER_PORT,
  WALLET_REPOSITORY,
  WALLET_RESTRICTION_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from './shared/payment.tokens';

import { CreateWalletForUserUseCase } from './wallet-balance/use-cases/create-wallet-for-user.use-case';
import { CreditWalletFromValidatedExamUseCase } from './wallet-balance/use-cases/credit-wallet-from-validated-exam.use-case';
import { GetMyWalletUseCase } from './wallet-balance/use-cases/get-my-wallet.use-case';
import { GetMyWalletTransactionsUseCase } from './wallet-balance/use-cases/get-my-wallet-transactions.use-case';
import { RequestWithdrawalUseCase } from './wallet-balance/use-cases/request-withdrawal.use-case';
import { VerifyWithdrawalOtpUseCase } from './otp/use-cases/verify-withdrawal-otp.use-case';
import { ResendWithdrawalOtpUseCase } from './otp/use-cases/resend-withdrawal-otp.use-case';
import { GetWithdrawalOtpDebugCodeUseCase } from './otp/use-cases/get-withdrawal-otp-debug-code.use-case';
import { HandleInfobipDeliveryReportUseCase } from './otp/use-cases/handle-infobip-delivery-report.use-case';
import { InfobipDeliveryPollingService } from './otp/infobip-delivery-polling.service';

import { UpsertPaymentAccountUseCase } from './user-payment/use-cases/upsert-payment-account.use-case';
import { GetPaymentAccountsUseCase } from './user-payment/use-cases/get-payment-accounts.use-case';
import {
  ApproveWithdrawalUseCase,
  ConfirmManualPaymentUseCase,
  GetPaymentConfigurationUseCase,
  ListAdminWithdrawalsUseCase,
  RejectWithdrawalUseCase,
  UnlockWithdrawalOtpUseCase,
  UpdatePaymentConfigurationUseCase,
} from './user-payment/use-cases/admin-withdrawal.use-cases';
import { GetUserPaymentActivityUseCase } from './user-payment/use-cases/get-user-payment-activity.use-case';

import {
  TypeOrmPaymentAuditLogAdapter,
  TypeOrmPaymentConfigurationRepository,
  TypeOrmPaymentExecutionRepository,
  TypeOrmUserPaymentAccountRepository,
  TypeOrmWithdrawalOtpRepository,
  TypeOrmWalletRepository,
  TypeOrmWalletRestrictionRepository,
  TypeOrmWalletTransactionRepository,
  TypeOrmWithdrawalRequestRepository,
  UtilisateursUserProfileAdapter,
} from './infrastructure/typeorm-payment.repositories';
import { FirebaseFcmPaymentNotificationAdapter } from './infrastructure/firebase-fcm-payment-notification.adapter';
import { InfobipOtpSmsAdapter } from './otp/infobip-otp-sms.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature(Object.values(paymentEntities) as any[]),
    ConfigModule,
    LocalConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'edukia-wallet-lab-secret',
      signOptions: { expiresIn: '8h' },
    }),
    UtilisateursModule,
    FirebaseModule,
  ],
  controllers: [
    WalletController,
    UserPaymentController,
    ExamRewardInternalController,
    InfobipDeliveryReportController,
  ],
  providers: [
    InternalApiKeyGuard,
    InfobipWebhookGuard,
    RuleEngineService,

    CreateWalletForUserUseCase,
    CreditWalletFromValidatedExamUseCase,
    GetMyWalletUseCase,
    GetMyWalletTransactionsUseCase,
    RequestWithdrawalUseCase,
    VerifyWithdrawalOtpUseCase,
    ResendWithdrawalOtpUseCase,
    GetWithdrawalOtpDebugCodeUseCase,
    HandleInfobipDeliveryReportUseCase,
    InfobipDeliveryPollingService,

    UpsertPaymentAccountUseCase,
    GetPaymentAccountsUseCase,
    ListAdminWithdrawalsUseCase,
    GetWithdrawalOtpDeliveryStatusUseCase,
    ApproveWithdrawalUseCase,
    RejectWithdrawalUseCase,
    UnlockWithdrawalOtpUseCase,
    ConfirmManualPaymentUseCase,
    GetPaymentConfigurationUseCase,
    UpdatePaymentConfigurationUseCase,
    GetUserPaymentActivityUseCase,

    { provide: WALLET_REPOSITORY, useClass: TypeOrmWalletRepository },
    { provide: WALLET_TRANSACTION_REPOSITORY, useClass: TypeOrmWalletTransactionRepository },
    { provide: WALLET_RESTRICTION_REPOSITORY, useClass: TypeOrmWalletRestrictionRepository },
    { provide: WITHDRAWAL_REQUEST_REPOSITORY, useClass: TypeOrmWithdrawalRequestRepository },
    { provide: WITHDRAWAL_OTP_REPOSITORY, useClass: TypeOrmWithdrawalOtpRepository },
    { provide: USER_PAYMENT_ACCOUNT_REPOSITORY, useClass: TypeOrmUserPaymentAccountRepository },
    { provide: PAYMENT_EXECUTION_REPOSITORY, useClass: TypeOrmPaymentExecutionRepository },
    { provide: PAYMENT_CONFIGURATION_REPOSITORY, useClass: TypeOrmPaymentConfigurationRepository },
    { provide: PAYMENT_NOTIFICATION_PORT, useClass: FirebaseFcmPaymentNotificationAdapter },
    { provide: PAYMENT_AUDIT_LOG_PORT, useClass: TypeOrmPaymentAuditLogAdapter },
    { provide: USER_PROFILE_PORT, useClass: UtilisateursUserProfileAdapter },
    { provide: OTP_SMS_SENDER_PORT, useClass: InfobipOtpSmsAdapter },
  ],
  exports: [
    CreateWalletForUserUseCase,
    CreditWalletFromValidatedExamUseCase,
    UpsertPaymentAccountUseCase,
    ConfirmManualPaymentUseCase,
    WALLET_REPOSITORY,
    WALLET_TRANSACTION_REPOSITORY,
  ],
})
export class WalletModule implements OnModuleInit {
  private readonly logger = new Logger(WalletModule.name);

  onModuleInit() {
    this.logger.log('WalletModule chargé : routes wallet, user-payment, OTP Infobip et internal exam rewards prêtes.');
  }
}
