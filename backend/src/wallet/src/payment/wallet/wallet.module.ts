import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UtilisateursModule } from 'src/utilisateurs/utilisateurs.module';
import { WalletController } from './wallet.controller';
import { CreateWalletForUserUseCase } from './use-cases/create-wallet-for-user.use-case';
import { CreditWalletFromValidatedExamUseCase } from './use-cases/credit-wallet-from-validated-exam.use-case';
import { GetMyWalletUseCase } from './use-cases/get-my-wallet.use-case';
import { RequestWithdrawalUseCase } from './use-cases/request-withdrawal.use-case';
import { RuleEngineService } from '../shared/rules-engine.service';
import {
  PAYMENT_AUDIT_LOG_PORT,
  PAYMENT_CONFIGURATION_REPOSITORY,
  PAYMENT_NOTIFICATION_PORT,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  USER_PROFILE_PORT,
  WALLET_REPOSITORY,
  WALLET_RESTRICTION_REPOSITORY,
  WALLET_TRANSACTION_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../shared/payment.tokens';
import {
  TypeOrmPaymentAuditLogAdapter,
  TypeOrmPaymentConfigurationRepository,
  TypeOrmUserPaymentAccountRepository,
  TypeOrmWalletRepository,
  TypeOrmWalletRestrictionRepository,
  TypeOrmWalletTransactionRepository,
  TypeOrmWithdrawalRequestRepository,
  UtilisateursUserProfileAdapter,
} from '../infrastructure/typeorm-payment.repositories';
import { FirebaseFcmPaymentNotificationAdapter } from '../infrastructure/firebase-fcm-payment-notification.adapter';
import * as paymentEntities from '../payment.entities';

@Module({
  imports: [TypeOrmModule.forFeature(Object.values(paymentEntities) as any[]), UtilisateursModule, FirebaseModule],
  controllers: [WalletController],
  providers: [
    RuleEngineService,
    CreateWalletForUserUseCase,
    CreditWalletFromValidatedExamUseCase,
    GetMyWalletUseCase,
    RequestWithdrawalUseCase,
    { provide: WALLET_REPOSITORY, useClass: TypeOrmWalletRepository },
    { provide: WALLET_TRANSACTION_REPOSITORY, useClass: TypeOrmWalletTransactionRepository },
    { provide: WALLET_RESTRICTION_REPOSITORY, useClass: TypeOrmWalletRestrictionRepository },
    { provide: WITHDRAWAL_REQUEST_REPOSITORY, useClass: TypeOrmWithdrawalRequestRepository },
    { provide: USER_PAYMENT_ACCOUNT_REPOSITORY, useClass: TypeOrmUserPaymentAccountRepository },
    { provide: PAYMENT_CONFIGURATION_REPOSITORY, useClass: TypeOrmPaymentConfigurationRepository },
    { provide: PAYMENT_NOTIFICATION_PORT, useClass: FirebaseFcmPaymentNotificationAdapter },
    { provide: PAYMENT_AUDIT_LOG_PORT, useClass: TypeOrmPaymentAuditLogAdapter },
    { provide: USER_PROFILE_PORT, useClass: UtilisateursUserProfileAdapter },
  ],
  exports: [CreateWalletForUserUseCase, CreditWalletFromValidatedExamUseCase, WALLET_REPOSITORY, WALLET_TRANSACTION_REPOSITORY],
})
export class WalletModule {}
