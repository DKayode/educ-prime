import { BadRequestException, ConflictException } from '@nestjs/common';
import { WalletModel } from '../../shared/payment.ports';
import { WalletStatus } from '../../shared/payment.enums';

export class WalletAggregate {
  private constructor(private readonly props: WalletModel) {}

  static create(userId: number, currency = 'XOF') {
    return new WalletAggregate({
      userId,
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      currency,
      status: WalletStatus.ACTIVE,
    });
  }

  static from(model: WalletModel) {
    return new WalletAggregate({ ...model });
  }

  get value(): WalletModel {
    return { ...this.props, balance: this.round(this.props.availableBalance + this.props.pendingBalance) };
  }

  creditPending(amount: number) {
    this.ensureActive();
    this.ensurePositive(amount);
    this.props.pendingBalance = this.round(this.props.pendingBalance + amount);
    this.props.balance = this.round(this.props.availableBalance + this.props.pendingBalance);
  }

  creditAvailable(amount: number) {
    this.ensureActive();
    this.ensurePositive(amount);
    this.props.availableBalance = this.round(this.props.availableBalance + amount);
    this.props.balance = this.round(this.props.availableBalance + this.props.pendingBalance);
  }

  debitAvailable(amount: number) {
    this.ensureActive();
    this.ensurePositive(amount);
    if (amount > this.props.availableBalance) throw new BadRequestException('Solde disponible insuffisant');
    this.props.availableBalance = this.round(this.props.availableBalance - amount);
    this.props.balance = this.round(this.props.availableBalance + this.props.pendingBalance);
  }

  releasePending(amount: number) {
    this.ensureActive();
    this.ensurePositive(amount);
    if (amount > this.props.pendingBalance) throw new BadRequestException('Montant supérieur au solde en attente');
    this.props.pendingBalance = this.round(this.props.pendingBalance - amount);
    this.props.availableBalance = this.round(this.props.availableBalance + amount);
    this.props.balance = this.round(this.props.availableBalance + this.props.pendingBalance);
  }

  private ensureActive() {
    if (this.props.status !== WalletStatus.ACTIVE) throw new ConflictException('Wallet non actif');
  }

  private ensurePositive(amount: number) {
    if (!amount || amount <= 0) throw new BadRequestException('Le montant doit être supérieur à zéro');
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
