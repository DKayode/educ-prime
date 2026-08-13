import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_AUDIT_LOG_PORT,
  USER_PAYMENT_ACCOUNT_REPOSITORY,
  WALLET_REPOSITORY,
  WITHDRAWAL_OTP_REPOSITORY,
  WITHDRAWAL_REQUEST_REPOSITORY,
} from '../../shared/payment.tokens';
import {
  PaymentAuditLogPort,
  UserPaymentAccountRepositoryPort,
  WalletRepositoryPort,
  WithdrawalOtpRepositoryPort,
  WithdrawalRequestRepositoryPort,
} from '../../shared/payment.ports';
import { MobileMoneyProvider, WithdrawalStatus } from '../../shared/payment.enums';
import { MOBILE_MONEY_PHONE_ERROR_MESSAGE, isOperatorAllowed, normalizeMobileMoneyPhoneDetailed, operatorMismatchMessage } from '../../shared/mobile-money-phone.util';

/**
 * Statuts pour lesquels le bénéficiaire est arrêté : l'OTP a été vérifié et un
 * administrateur peut virer l'argent à tout moment.
 *
 * `upsertDefault` modifie la ligne du compte SUR PLACE, et la demande de retrait
 * pointe sur cette ligne : changer de numéro à ce stade réécrirait le
 * bénéficiaire d'une demande déjà validée. L'administrateur paierait un numéro
 * que la vérification OTP n'a jamais couvert — et quelqu'un ayant pris la main
 * sur un compte pourrait détourner un virement sans nouvel OTP.
 *
 * OTP_PENDING est délibérément absent : c'est l'état de qui s'est trompé de
 * numéro, et il n'existe aucun moyen d'annuler soi-même une demande. Le
 * bloquer là enfermerait l'utilisateur. Le code en attente est donc expiré au
 * changement, pour qu'un code envoyé à l'ancien numéro ne puisse pas valider
 * une demande qui pointe désormais ailleurs.
 */
const LOCKED_WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  WithdrawalStatus.PENDING,
  WithdrawalStatus.APPROVED,
  WithdrawalStatus.PROCESSING,
  WithdrawalStatus.SECURITY_REVIEW_REQUIRED,
];

@Injectable()
export class UpsertPaymentAccountUseCase {
  constructor(
    @Inject(USER_PAYMENT_ACCOUNT_REPOSITORY) private readonly accounts: UserPaymentAccountRepositoryPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WITHDRAWAL_REQUEST_REPOSITORY) private readonly withdrawals: WithdrawalRequestRepositoryPort,
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
  ) {}

  async execute(data: { userId: number; operator: MobileMoneyProvider; phoneNumber: string; accountName: string; changedBy: number }) {
    const phone = normalizeMobileMoneyPhoneDetailed(data.phoneNumber);
    if (!phone) {
      throw new BadRequestException(MOBILE_MONEY_PHONE_ERROR_MESSAGE);
    }
    if (!isOperatorAllowed(data.operator, phone.spec)) {
      throw new BadRequestException(operatorMismatchMessage(data.operator, phone.spec));
    }
    const normalizedPhoneNumber = phone.display;

    const openWithdrawal = await this.findOpenWithdrawal(data.userId);
    if (openWithdrawal && LOCKED_WITHDRAWAL_STATUSES.includes(openWithdrawal.status)) {
      throw new ConflictException(
        'Une demande de retrait est en cours de traitement. Elle doit être payée ou rejetée avant de modifier votre compte Mobile Money.',
      );
    }

    const account = await this.accounts.upsertDefault({ ...data, phoneNumber: normalizedPhoneNumber });

    if (openWithdrawal?.status === WithdrawalStatus.OTP_PENDING) {
      await this.otps.expireActiveByWithdrawalId(openWithdrawal.id);
    }

    await this.audit.log({
      adminId: data.changedBy,
      action: 'USER_PAYMENT_ACCOUNT_UPSERTED',
      entity: 'UserPaymentAccount',
      entityId: account.id,
      newValue: { userId: data.userId, operator: data.operator, phoneNumber: normalizedPhoneNumber },
    });
    return account;
  }

  private async findOpenWithdrawal(userId: number) {
    const wallet = await this.wallets.findByUserId(userId);
    if (!wallet?.id) return null;
    return this.withdrawals.findOpenByWalletId(wallet.id);
  }
}
