export enum PrestatairePaiement {
  KKIAPAY = 'KKIAPAY',
  FEDAPAY = 'FEDAPAY',
  CINETPAY = 'CINETPAY',
  FLUTTERWAVE = 'FLUTTERWAVE',
  STRIPE = 'STRIPE',
  REVENUECAT = 'REVENUECAT',
}

export enum MethodePaiement {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARTE = 'CARTE',
  IAP = 'IAP',
}

export enum StatutPaiement {
  INITIE = 'INITIE',
  EN_ATTENTE = 'EN_ATTENTE',
  REUSSI = 'REUSSI',
  ECHOUE = 'ECHOUE',
  ANNULE = 'ANNULE',
  EXPIRE = 'EXPIRE',
  REMBOURSE = 'REMBOURSE',
}

export enum ModePaiement {
  SANDBOX = 'sandbox',
  LIVE = 'live',
}
