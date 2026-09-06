import { BadRequestException } from '@nestjs/common';
import { CreditRewardSourceUseCase } from '../../user-payment/use-cases/credit-reward-source.use-case';
import { FeeType, RewardSourceTypeCode, WalletStatus } from '../../shared/payment.enums';

/**
 * Calcul du montant d'une récompense en POURCENTAGE (#246).
 *
 * Les récompenses historiques (épreuve, examen, concours) restent en montant
 * fixe ; seule la commission de parrainage suit le prix payé.
 */
describe('CreditRewardSourceUseCase — commission en pourcentage', () => {
  const configuration = (surcharges: any = {}) => ({
    rewardSourceTypeId: 'rst-1',
    rewardSourceTypeCode: RewardSourceTypeCode.PARRAINAGE_ABONNEMENT,
    rewardSourceTypeLabel: 'Commission de parrainage',
    rewardAmount: 0,
    commissionType: FeeType.PERCENTAGE,
    commissionPercentage: 10,
    currency: 'XOF',
    rewardEnabled: true,
    isActive: true,
    reviewDelayHours: 0,
    requiresAdminValidation: false,
    dailyRewardAmountLimit: 0,
    monthlyRewardAmountLimit: 0,
    maxRewardsPerUserPerDay: 0,
    maxRewardsPerUserPerMonth: 0,
    ...surcharges,
  });

  const construire = (config: any) => {
    const wallet = { id: 'w-1', status: WalletStatus.ACTIVE, balance: 0, availableBalance: 0, pendingBalance: 0 };
    const useCase = new CreditRewardSourceUseCase(
      { findByUserId: jest.fn().mockResolvedValue(wallet), createForUser: jest.fn(), updateBalances: jest.fn().mockResolvedValue(wallet) } as any,
      {
        existsByReference: jest.fn().mockResolvedValue(false),
        existsRewardForWalletSource: jest.fn().mockResolvedValue(false),
        countRewardsForWalletSourceType: jest.fn().mockResolvedValue(0),
        sumRewardsForWalletSourceType: jest.fn().mockResolvedValue(0),
        create: jest.fn(async (t: any) => ({ id: 't-1', ...t })),
      } as any,
      { getActive: jest.fn().mockResolvedValue({ walletEnabled: true, rewardEnabled: true, currency: 'XOF' }) } as any,
      { getActiveBySourceTypeCode: jest.fn().mockResolvedValue(config) } as any,
      { notifyUser: jest.fn().mockResolvedValue(undefined) } as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
    );
    return useCase;
  };

  const commande = (surcharges: any = {}) => ({
    userId: 20,
    sourceType: RewardSourceTypeCode.PARRAINAGE_ABONNEMENT,
    sourceId: 'abo-1',
    baseAmount: 2000,
    ...surcharges,
  });

  it('applique le taux au montant de base', async () => {
    const r = await construire(configuration()).execute(commande() as any);
    expect(r.transaction.amount).toBe(200); // 10 % de 2000
  });

  it('arrondit à l’entier — le XOF n’a pas de subdivision', async () => {
    // 7 % de 18 000 = 1260 ; 7,5 % de 999 = 74,925 → 75.
    const r = await construire(configuration({ commissionPercentage: 7.5 })).execute(
      commande({ baseAmount: 999 }) as any,
    );
    expect(r.transaction.amount).toBe(75);
    expect(Number.isInteger(r.transaction.amount)).toBe(true);
  });

  it('refuse un taux à zéro plutôt que de créditer 0', async () => {
    await expect(
      construire(configuration({ commissionPercentage: 0 })).execute(commande() as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige un montant de base en pourcentage', async () => {
    await expect(
      construire(configuration()).execute(commande({ baseAmount: undefined, amount: undefined }) as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('laisse les récompenses FIXED inchangées', async () => {
    const config = configuration({
      rewardSourceTypeCode: RewardSourceTypeCode.EPREUVE,
      commissionType: FeeType.FIXED,
      rewardAmount: 100,
      commissionPercentage: 0,
    });
    const r = await construire(config).execute({
      userId: 20,
      sourceType: RewardSourceTypeCode.EPREUVE,
      sourceId: 'ep-1',
    } as any);
    expect(r.transaction.amount).toBe(100);
  });
});
