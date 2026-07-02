import { Inject, Injectable } from '@nestjs/common';
import { WalletAggregate } from '../domain/wallet.aggregate';
import { PAYMENT_CONFIGURATION_REPOSITORY, WALLET_REPOSITORY, WALLET_RESTRICTION_REPOSITORY } from '../../shared/payment.tokens';
import { PaymentConfigurationRepositoryPort, WalletRepositoryPort, WalletRestrictionRepositoryPort } from '../../shared/payment.ports';

@Injectable()
export class CreateWalletForUserUseCase {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepositoryPort,
    @Inject(WALLET_RESTRICTION_REPOSITORY) private readonly restrictions: WalletRestrictionRepositoryPort,
    @Inject(PAYMENT_CONFIGURATION_REPOSITORY) private readonly configurations: PaymentConfigurationRepositoryPort,
  ) {}

  async execute(userId: number) {
    const existing = await this.wallets.findByUserId(userId);
    if (existing) return existing;

    const configuration = await this.configurations.getActive();
    const wallet = await this.wallets.createForUser(userId, configuration.currency);
    await this.restrictions.ensureForUser(userId);

    return WalletAggregate.from(wallet).value;
  }
}
