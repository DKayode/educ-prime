import { MobileMoneyProvider } from '../../shared/payment.enums';
import {
  MOBILE_MONEY_COUNTRIES,
  MOBILE_MONEY_PHONE_REGEX,
  isValidMobileMoneyPhone,
  normalizeMobileMoneyPhone,
  normalizeMobileMoneyPhoneDetailed,
  toE164MobileMoneyPhone,
} from '../../shared/mobile-money-phone.util';

describe('mobile-money-phone.util', () => {
  describe('Bénin (+229)', () => {
    it('normalise un numéro saisi avec des séparateurs', () => {
      expect(normalizeMobileMoneyPhone('+229 01 61 34 55 78')).toBe('+229 0161345578');
      expect(normalizeMobileMoneyPhone('+229-01.61345578')).toBe('+229 0161345578');
    });

    it("rejette l'ancienne numérotation à 8 chiffres", () => {
      expect(normalizeMobileMoneyPhone('+22961345578')).toBeNull();
    });
  });

  describe('Sénégal (+221)', () => {
    it.each(['+221 771234567', '+221 781234567', '+221 761234567', '+221 701234567', '+221 751234567'])(
      'accepte %s',
      (value) => {
        expect(normalizeMobileMoneyPhone(value)).toBe(`+221 ${value.replace('+221 ', '')}`);
      },
    );

    it('rejette un mobile hors plage ou de mauvaise longueur', () => {
      expect(normalizeMobileMoneyPhone('+221 331234567')).toBeNull(); // fixe
      expect(normalizeMobileMoneyPhone('+221 77123456')).toBeNull(); // 8 chiffres
      expect(normalizeMobileMoneyPhone('+221 7712345678')).toBeNull(); // 10 chiffres
    });
  });

  describe('Congo (+242)', () => {
    it.each(['+242 061234567', '+242 051234567', '+242 041234567'])('accepte %s', (value) => {
      expect(isValidMobileMoneyPhone(value)).toBe(true);
    });

    it('rejette un préfixe inconnu', () => {
      expect(normalizeMobileMoneyPhone('+242 071234567')).toBeNull();
    });
  });

  describe('pays fermés', () => {
    it.each(['+33 612345678', '+225 0701020304', '+243 991234567', '229 0161345578', ''])(
      'rejette %s',
      (value) => {
        expect(isValidMobileMoneyPhone(value)).toBe(false);
      },
    );
  });

  it('produit une forme E.164 sans espace', () => {
    expect(toE164MobileMoneyPhone('+229 0161345578')).toBe('+2290161345578');
    expect(toE164MobileMoneyPhone('+221 771234567')).toBe('+221771234567');
    expect(toE164MobileMoneyPhone('+242 061234567')).toBe('+242061234567');
  });

  it('rattache chaque numéro à son pays', () => {
    expect(normalizeMobileMoneyPhoneDetailed('+229 0161345578')?.country).toBe('benin');
    expect(normalizeMobileMoneyPhoneDetailed('+221 771234567')?.country).toBe('senegal');
    expect(normalizeMobileMoneyPhoneDetailed('+242 061234567')?.country).toBe('congo');
  });

  it("n'autorise Moov et Celtiis qu'au Bénin", () => {
    const operators = (dial: string) =>
      MOBILE_MONEY_COUNTRIES.find((c) => c.dialCode === dial)!.operatorsAllowed;

    expect(operators('229')).toContain(MobileMoneyProvider.MOOV_MONEY);
    expect(operators('221')).toEqual([MobileMoneyProvider.MTN_MOMO]);
    expect(operators('242')).toEqual([MobileMoneyProvider.MTN_MOMO]);
  });

  describe('regex des DTO', () => {
    it('accepte les trois pays, séparateurs compris', () => {
      expect(MOBILE_MONEY_PHONE_REGEX.test('+229 01 61 34 55 78')).toBe(true);
      expect(MOBILE_MONEY_PHONE_REGEX.test('+221 77 123 45 67')).toBe(true);
      expect(MOBILE_MONEY_PHONE_REGEX.test('+242-06-123-4567')).toBe(true);
    });

    it('reste alignée avec la normalisation', () => {
      const cases = [
        '+229 0161345578',
        '+221 771234567',
        '+242 061234567',
        '+22961345578',
        '+221 331234567',
        '+33 612345678',
      ];
      for (const value of cases) {
        expect(MOBILE_MONEY_PHONE_REGEX.test(value.replace(/\s/g, ''))).toBe(
          isValidMobileMoneyPhone(value),
        );
      }
    });
  });
});
