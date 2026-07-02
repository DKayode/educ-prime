import { Inject, Injectable } from '@nestjs/common';
import { USER_PAYMENT_ACCOUNT_REPOSITORY } from '../../shared/payment.tokens';
import { UserPaymentAccountRepositoryPort } from '../../shared/payment.ports';

@Injectable()
export class GetPaymentAccountsUseCase {
  constructor(@Inject(USER_PAYMENT_ACCOUNT_REPOSITORY) private readonly accounts: UserPaymentAccountRepositoryPort) {}
  execute(userId: number) { return this.accounts.findByUserId(userId); }
}
