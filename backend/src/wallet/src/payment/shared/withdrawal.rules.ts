import { BusinessRule, RuleResult } from './rules-engine.service';
import { PaymentConfigurationModel, WalletModel, WalletRestrictionModel } from './payment.ports';
import { BENIN_MOBILE_MONEY_PHONE_FORMAT, isValidBeninMobileMoneyPhone } from './benin-phone-number.util';
import { WalletStatus } from './payment.enums';

export interface WithdrawalRuleContext {
  user: { id: number; isEmailVerified: boolean; isDisabled?: boolean };
  wallet: WalletModel;
  restriction?: WalletRestrictionModel | null;
  amount: number;
  existingPendingWithdrawal: boolean;
  configuration: PaymentConfigurationModel;
  dailyWithdrawalTotal: number;
  monthlyWithdrawalTotal: number;
  todayWithdrawalCount: number;
  weekWithdrawalCount: number;
  monthWithdrawalCount: number;
  paymentAccountExists: boolean;
  paymentAccountPhoneNumber?: string | null;
}

const ok = (): RuleResult => ({ passed: true });
const fail = (code: string, message: string): RuleResult => ({ passed: false, code, message });

export class WalletFeatureEnabledRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'WALLET_FEATURE_ENABLED';
  evaluate(ctx: WithdrawalRuleContext) {
    if (ctx.configuration.maintenanceMode) return fail(this.name, 'Le module paiement est en maintenance');
    if (!ctx.configuration.walletEnabled) return fail(this.name, 'Le wallet est désactivé');
    if (!ctx.configuration.withdrawEnabled) return fail(this.name, 'Les retraits sont actuellement désactivés');
    return ok();
  }
}

export class VerifiedEmailRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'EMAIL_VERIFIED';
  evaluate(ctx: WithdrawalRuleContext) {
    return ctx.user.isEmailVerified ? ok() : fail(this.name, 'Votre adresse mail doit être vérifiée avant tout retrait');
  }
}

export class UserEnabledRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'USER_ENABLED';
  evaluate(ctx: WithdrawalRuleContext) {
    return !ctx.user.isDisabled ? ok() : fail(this.name, 'Votre compte utilisateur est désactivé');
  }
}

export class WalletActiveRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'WALLET_ACTIVE';
  evaluate(ctx: WithdrawalRuleContext) {
    return ctx.wallet.status === WalletStatus.ACTIVE ? ok() : fail(this.name, 'Votre wallet n’est pas actif');
  }
}

export class RestrictionCanWithdrawRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'RESTRICTION_CAN_WITHDRAW';
  evaluate(ctx: WithdrawalRuleContext) {
    if (!ctx.restriction) return ok();
    if (ctx.restriction.blocked) return fail(this.name, 'Votre wallet est bloqué');
    if (ctx.restriction.blockedUntil && ctx.restriction.blockedUntil > new Date()) {
      return fail(this.name, 'Votre wallet est temporairement bloqué');
    }
    return ctx.restriction.canWithdraw ? ok() : fail(this.name, 'Votre profil n’est pas autorisé à effectuer un retrait');
  }
}

export class AvailableBalanceRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'AVAILABLE_BALANCE';
  evaluate(ctx: WithdrawalRuleContext) {
    const withdrawable = Math.max(0, ctx.wallet.availableBalance - (ctx.configuration.minimumWalletBalance ?? 0));
    return ctx.amount <= withdrawable ? ok() : fail(this.name, 'Solde disponible insuffisant pour cette requête');
  }
}

export class MinMaxWithdrawalRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'MIN_MAX_WITHDRAWAL';
  evaluate(ctx: WithdrawalRuleContext) {
    if (ctx.amount < ctx.configuration.minimumWithdrawal) return fail(this.name, `Le montant minimum est ${ctx.configuration.minimumWithdrawal}`);
    if (ctx.amount > ctx.configuration.maximumWithdrawal) return fail(this.name, `Le montant maximum est ${ctx.configuration.maximumWithdrawal}`);
    return ok();
  }
}

export class NoPendingWithdrawalRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'NO_PENDING_WITHDRAWAL';
  evaluate(ctx: WithdrawalRuleContext) {
    return ctx.existingPendingWithdrawal ? fail(this.name, 'Une demande de retrait est déjà en cours') : ok();
  }
}

export class WithdrawalLimitRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'WITHDRAWAL_LIMIT';
  evaluate(ctx: WithdrawalRuleContext) {
    if (ctx.dailyWithdrawalTotal + ctx.amount > ctx.configuration.dailyWithdrawalLimit) return fail(this.name, 'Limite journalière dépassée');
    if (ctx.monthlyWithdrawalTotal + ctx.amount > ctx.configuration.monthlyWithdrawalLimit) return fail(this.name, 'Limite mensuelle dépassée');
    if (ctx.todayWithdrawalCount >= ctx.configuration.maxWithdrawPerDay) return fail(this.name, 'Nombre maximum de retraits par jour atteint');
    if (ctx.weekWithdrawalCount >= ctx.configuration.maxWithdrawPerWeek) return fail(this.name, 'Nombre maximum de retraits par semaine atteint');
    if (ctx.monthWithdrawalCount >= ctx.configuration.maxWithdrawPerMonth) return fail(this.name, 'Nombre maximum de retraits par mois atteint');
    return ok();
  }
}

export class PaymentAccountExistsRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'PAYMENT_ACCOUNT_EXISTS';
  evaluate(ctx: WithdrawalRuleContext) {
    return ctx.paymentAccountExists ? ok() : fail(this.name, 'Aucun compte Mobile Money par défaut n’est enregistré');
  }
}

export class BeninPaymentAccountPhoneRule implements BusinessRule<WithdrawalRuleContext> {
  readonly name = 'BENIN_PAYMENT_ACCOUNT_PHONE';
  evaluate(ctx: WithdrawalRuleContext) {
    return isValidBeninMobileMoneyPhone(ctx.paymentAccountPhoneNumber)
      ? ok()
      : fail(this.name, `Le numéro Mobile Money doit respecter le format béninois ${BENIN_MOBILE_MONEY_PHONE_FORMAT}`);
  }
}

export const DEFAULT_WITHDRAWAL_RULES = [
  new WalletFeatureEnabledRule(),
  new VerifiedEmailRule(),
  new UserEnabledRule(),
  new WalletActiveRule(),
  new RestrictionCanWithdrawRule(),
  new AvailableBalanceRule(),
  new MinMaxWithdrawalRule(),
  new NoPendingWithdrawalRule(),
  new WithdrawalLimitRule(),
  new PaymentAccountExistsRule(),
  new BeninPaymentAccountPhoneRule(),
];
