import { BadRequestException, ConflictException } from '@nestjs/common';
import { UpsertPaymentAccountUseCase } from '../../user-payment/use-cases/upsert-payment-account.use-case';
import { MobileMoneyProvider, WithdrawalStatus } from '../../shared/payment.enums';

describe('UpsertPaymentAccountUseCase', () => {
  const build = (openStatus?: WithdrawalStatus) => {
    const expired: string[] = [];
    const saved: any[] = [];
    const accounts: any = {
      upsertDefault: async (d: any) => {
        saved.push(d);
        return { id: 'acc1', ...d };
      },
    };
    const audit: any = { log: async () => undefined };
    const wallets: any = { findByUserId: async () => ({ id: 'w1' }) };
    const withdrawals: any = {
      findOpenByWalletId: async () => (openStatus ? { id: 'wd1', status: openStatus } : null),
    };
    const otps: any = {
      expireActiveByWithdrawalId: async (id: string) => {
        expired.push(id);
      },
    };
    const useCase = new UpsertPaymentAccountUseCase(accounts, audit, wallets, withdrawals, otps);
    return { useCase, expired, saved };
  };

  const command = (over: Partial<Record<string, unknown>> = {}) => ({
    userId: 1,
    operator: MobileMoneyProvider.MTN_MOMO,
    phoneNumber: '+229 0161345578',
    accountName: 'Titulaire',
    changedBy: 1,
    ...over,
  }) as any;

  it('enregistre le compte quand aucune demande n’est ouverte', async () => {
    const { useCase, saved } = build();
    await expect(useCase.execute(command())).resolves.toMatchObject({ id: 'acc1' });
    expect(saved[0].phoneNumber).toBe('+229 0161345578');
  });

  it.each([
    WithdrawalStatus.PENDING,
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.PROCESSING,
    WithdrawalStatus.SECURITY_REVIEW_REQUIRED,
  ])('refuse le changement quand une demande est en %s', async (status) => {
    const { useCase, saved } = build(status);
    await expect(useCase.execute(command())).rejects.toBeInstanceOf(ConflictException);
    expect(saved).toHaveLength(0);
  });

  it('autorise le changement en OTP_PENDING et périme le code en attente', async () => {
    const { useCase, expired, saved } = build(WithdrawalStatus.OTP_PENDING);
    await expect(useCase.execute(command())).resolves.toMatchObject({ id: 'acc1' });
    expect(saved).toHaveLength(1);
    expect(expired).toEqual(['wd1']);
  });

  it('ne périme aucun code quand aucune demande n’est ouverte', async () => {
    const { useCase, expired } = build();
    await useCase.execute(command());
    expect(expired).toHaveLength(0);
  });

  it('refuse un numéro hors des pays ouverts avant même de regarder les demandes', async () => {
    const { useCase } = build(WithdrawalStatus.PENDING);
    await expect(useCase.execute(command({ phoneNumber: '+33 612345678' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuse Wave sur un numéro béninois', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute(command({ operator: MobileMoneyProvider.WAVE })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepte Wave sur un numéro sénégalais', async () => {
    const { useCase, saved } = build();
    await useCase.execute(
      command({ operator: MobileMoneyProvider.WAVE, phoneNumber: '+221 771234567' }),
    );
    expect(saved[0].phoneNumber).toBe('+221 771234567');
  });
});
