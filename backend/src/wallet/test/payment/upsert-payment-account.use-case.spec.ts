import { BadRequestException } from '@nestjs/common';
import { UpsertPaymentAccountUseCase } from '../../user-payment/use-cases/upsert-payment-account.use-case';
import { MobileMoneyProvider } from '../../shared/payment.enums';

describe('UpsertPaymentAccountUseCase', () => {
  it('normalise le numéro Mobile Money avant persistance', async () => {
    const accounts: any = {
      upsertDefault: jest.fn(async (data: any) => ({ id: 'acc1', ...data })),
    };
    const audit: any = { log: jest.fn(async () => undefined) };
    const uc = new UpsertPaymentAccountUseCase(accounts, audit);

    const result = await uc.execute({
      userId: 1,
      operator: MobileMoneyProvider.MTN_MOMO,
      phoneNumber: '+229 01 61 34 55 78',
      accountName: 'Cedric CHEDE',
      changedBy: 1,
    });

    expect(result.phoneNumber).toBe('+229 0161345578');
    expect(accounts.upsertDefault).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: '+229 0161345578' }));
  });

  it('retourne une BadRequestException si le numéro ne respecte pas +229 01XXXXXXXX', async () => {
    const accounts: any = { upsertDefault: jest.fn() };
    const audit: any = { log: jest.fn() };
    const uc = new UpsertPaymentAccountUseCase(accounts, audit);

    await expect(uc.execute({
      userId: 1,
      operator: MobileMoneyProvider.MTN_MOMO,
      phoneNumber: '+22961345578',
      accountName: 'Cedric CHEDE',
      changedBy: 1,
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(accounts.upsertDefault).not.toHaveBeenCalled();
  });
});
