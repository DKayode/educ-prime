import { MobileMoneyProvider } from './payment.enums';

/**
 * Numéros Mobile Money acceptés par le module paiement.
 *
 * Le module est né béninois : un seul indicatif, un seul format. L'ouverture au
 * Sénégal et au Congo-Brazzaville se fait par table plutôt que par regex
 * empilées — ajouter un pays revient à ajouter une ligne.
 *
 * La validation porte sur le format **national du pays**, pas sur les préfixes
 * de l'opérateur : ceux-ci changent au gré des attributions de l'ARCEP locale,
 * et un numéro refusé à tort est plus coûteux qu'un opérateur mal étiqueté.
 *
 * Le couple pays/opérateur, lui, est vérifié (`operatorsAllowed`). La liste
 * décrit **par où l'argent sort**, pas le réseau du bénéficiaire :
 *   Bénin et Congo — virement par MTN Mobile Money, donc MTN seul.
 *   Sénégal — virement par Wave. Wave n'est pas un opérateur télécom et
 *     fonctionne quel que soit le réseau du numéro ; le format sénégalais
 *     accepte donc tous les mobiles, mais le moyen de paiement reste Wave.
 */
export interface MobileMoneyCountrySpec {
  /** Slug pays de la plateforme (config.json). */
  country: string;
  label: string;
  /** Indicatif sans le « + ». */
  dialCode: string;
  /** Chiffres nationaux, une fois espaces et séparateurs retirés. */
  nationalPattern: RegExp;
  /** Forme montrée à l'utilisateur dans les messages d'erreur. */
  format: string;
  /** Moyens de paiement par lesquels le virement peut être exécuté. */
  operatorsAllowed: MobileMoneyProvider[];
}

export const MOBILE_MONEY_COUNTRIES: MobileMoneyCountrySpec[] = [
  {
    country: 'benin',
    label: 'Bénin',
    dialCode: '229',
    // Numérotation à 10 chiffres depuis 2023 : 01 puis 8 chiffres.
    nationalPattern: /^01\d{8}$/,
    format: '+229 01XXXXXXXX',
    operatorsAllowed: [MobileMoneyProvider.MTN_MOMO],
  },
  {
    country: 'senegal',
    label: 'Sénégal',
    dialCode: '221',
    // Mobiles à 9 chiffres : 70, 75, 76, 77 ou 78.
    nationalPattern: /^7[05678]\d{7}$/,
    format: '+221 7XXXXXXXX',
    // Tous les mobiles sénégalais sont acceptés — Wave marche sur n'importe
    // quel réseau — mais le virement lui-même passe par Wave.
    operatorsAllowed: [MobileMoneyProvider.WAVE],
  },
  {
    country: 'congo',
    label: 'Congo',
    dialCode: '242',
    // Congo-Brazzaville, mobiles à 9 chiffres : 04, 05 ou 06.
    nationalPattern: /^0[456]\d{7}$/,
    format: '+242 0XXXXXXXX',
    operatorsAllowed: [MobileMoneyProvider.MTN_MOMO],
  },
];

/**
 * Regex unique pour `@Matches` sur les DTO : union des trois formats, avec les
 * espaces, points et tirets tolérés à la saisie.
 */
export const MOBILE_MONEY_PHONE_REGEX =
  /^\+(?:229[\s.-]?01(?:[\s.-]?\d){8}|221[\s.-]?7[05678](?:[\s.-]?\d){7}|242[\s.-]?0[456](?:[\s.-]?\d){7})$/;

export const MOBILE_MONEY_PHONE_FORMATS = MOBILE_MONEY_COUNTRIES.map((c) => c.format).join(', ');

export const MOBILE_MONEY_PHONE_ERROR_MESSAGE =
  `Le numéro Mobile Money doit respecter l'un des formats acceptés : ${MOBILE_MONEY_PHONE_FORMATS}`;

export interface NormalizedMobileMoneyPhone {
  /** Forme stockée et affichée : « +229 0197000000 ». */
  display: string;
  /** Forme E.164 sans espace, pour les fournisseurs SMS. */
  e164: string;
  country: string;
  spec: MobileMoneyCountrySpec;
}

export function normalizeMobileMoneyPhoneDetailed(
  phoneNumber: string,
): NormalizedMobileMoneyPhone | null {
  if (typeof phoneNumber !== 'string') return null;

  const compact = phoneNumber.trim().replace(/[\s.-]/g, '');
  if (!compact.startsWith('+')) return null;

  const digits = compact.slice(1);
  for (const spec of MOBILE_MONEY_COUNTRIES) {
    if (!digits.startsWith(spec.dialCode)) continue;
    const national = digits.slice(spec.dialCode.length);
    if (!spec.nationalPattern.test(national)) return null;
    return {
      display: `+${spec.dialCode} ${national}`,
      e164: `+${spec.dialCode}${national}`,
      country: spec.country,
      spec,
    };
  }
  return null;
}

/** Forme stockée, ou null si le numéro n'appartient à aucun pays ouvert. */
export function normalizeMobileMoneyPhone(phoneNumber: string): string | null {
  return normalizeMobileMoneyPhoneDetailed(phoneNumber)?.display ?? null;
}

export function isValidMobileMoneyPhone(phoneNumber?: string | null): boolean {
  return normalizeMobileMoneyPhoneDetailed(phoneNumber ?? '') !== null;
}

export function toE164MobileMoneyPhone(phoneNumber?: string | null): string | null {
  return normalizeMobileMoneyPhoneDetailed(phoneNumber ?? '')?.e164 ?? null;
}

/**
 * Message d'erreur quand l'opérateur choisi n'existe pas dans le pays du
 * numéro — plus utile que « format invalide », puisque le numéro, lui, est bon.
 */
export function isOperatorAllowed(
  operator: MobileMoneyProvider,
  spec: MobileMoneyCountrySpec,
): boolean {
  return spec.operatorsAllowed.includes(operator);
}

export function operatorMismatchMessage(
  operator: MobileMoneyProvider,
  spec: MobileMoneyCountrySpec,
): string {
  return `Le moyen de paiement ${operator} n'est pas disponible pour un numéro ${spec.label} (${spec.format}). Accepté${spec.operatorsAllowed.length > 1 ? 's' : ''} : ${spec.operatorsAllowed.join(', ')}.`;
}
