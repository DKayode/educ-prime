import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PAYMENT_AUDIT_LOG_PORT, USER_PAYMENT_ACCOUNT_REPOSITORY } from '../../shared/payment.tokens';
import { PaymentAuditLogPort, UserPaymentAccountRepositoryPort } from '../../shared/payment.ports';
import { MobileMoneyProvider } from '../../shared/payment.enums';
import { MOBILE_MONEY_PHONE_ERROR_MESSAGE, normalizeMobileMoneyPhoneDetailed, operatorMismatchMessage } from '../../shared/mobile-money-phone.util';

@Injectable()
export class UpsertPaymentAccountUseCase {
  constructor(
    @Inject(USER_PAYMENT_ACCOUNT_REPOSITORY) private readonly accounts: UserPaymentAccountRepositoryPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT) private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(data: { userId: number; operator: MobileMoneyProvider; phoneNumber: string; accountName: string; changedBy: number }) {
    const phone = normalizeMobileMoneyPhoneDetailed(data.phoneNumber);
    if (!phone) {
      throw new BadRequestException(MOBILE_MONEY_PHONE_ERROR_MESSAGE);
    }
    if (!phone.spec.operatorsAllowed.includes(data.operator)) {
      throw new BadRequestException(operatorMismatchMessage(data.operator, phone.spec));
    }
    const normalizedPhoneNumber = phone.display;

    const account = await this.accounts.upsertDefault({ ...data, phoneNumber: normalizedPhoneNumber });
    await this.audit.log({
      adminId: data.changedBy,
      action: 'USER_PAYMENT_ACCOUNT_UPSERTED',
      entity: 'UserPaymentAccount',
      entityId: account.id,
      newValue: { userId: data.userId, operator: data.operator, phoneNumber: normalizedPhoneNumber },
    });
    return account;
  }
}
