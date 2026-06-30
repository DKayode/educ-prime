/**
 * Format Mobile Money cible EDUKIA Bénin.
 *
 * Depuis la migration vers la numérotation à 10 chiffres au Bénin,
 * le format international attendu dans le module paiement est :
 * +229 01XXXXXXXX
 *
 * Le validateur accepte uniquement le préfixe pays +229 et le préfixe national 01.
 * Les espaces, tirets et points sont tolérés à la saisie, puis normalisés.
 */
export const BENIN_MOBILE_MONEY_PHONE_FORMAT = '+229 01XXXXXXXX';
export const BENIN_MOBILE_MONEY_PHONE_ERROR_MESSAGE =
  `Le numéro Mobile Money doit respecter le format béninois ${BENIN_MOBILE_MONEY_PHONE_FORMAT}`;

export const BENIN_MOBILE_MONEY_PHONE_REGEX = /^\+229(?:[\s.-]?01)(?:[\s.-]?\d){8}$/;
const BENIN_MOBILE_MONEY_PHONE_NORMALIZED_REGEX = /^\+22901\d{8}$/;

export function normalizeBeninMobileMoneyPhone(phoneNumber: string): string | null {
  if (typeof phoneNumber !== 'string') return null;

  const compact = phoneNumber.trim().replace(/[\s.-]/g, '');
  if (!BENIN_MOBILE_MONEY_PHONE_NORMALIZED_REGEX.test(compact)) return null;

  const nationalNumber = compact.slice(4);
  return `+229 ${nationalNumber}`;
}

export function isValidBeninMobileMoneyPhone(phoneNumber?: string | null): boolean {
  if (!phoneNumber) return false;
  return normalizeBeninMobileMoneyPhone(phoneNumber) !== null;
}
