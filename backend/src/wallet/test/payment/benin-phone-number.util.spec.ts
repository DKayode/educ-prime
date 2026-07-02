import {
  isValidBeninMobileMoneyPhone,
  normalizeBeninMobileMoneyPhone,
} from '../../shared/benin-phone-number.util';

describe('Benin mobile money phone number validation', () => {
  it('accepte et normalise le format +229 01XXXXXXXX', () => {
    expect(isValidBeninMobileMoneyPhone('+229 0161345578')).toBe(true);
    expect(normalizeBeninMobileMoneyPhone('+229 01 61 34 55 78')).toBe('+229 0161345578');
  });

  it('refuse les anciens formats à 8 chiffres sans préfixe 01', () => {
    expect(isValidBeninMobileMoneyPhone('+22961345578')).toBe(false);
    expect(normalizeBeninMobileMoneyPhone('+22961345578')).toBeNull();
  });

  it('refuse les numéros sans indicatif international +229', () => {
    expect(isValidBeninMobileMoneyPhone('0161345578')).toBe(false);
  });
});
