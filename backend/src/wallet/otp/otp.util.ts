import { createHash, randomInt } from 'crypto';

export function generateNumericOtp(length = 6): string {
  const safeLength = Math.min(Math.max(Number(length || 6), 4), 8);
  const min = 10 ** (safeLength - 1);
  const max = 10 ** safeLength;
  return String(randomInt(min, max));
}

export function hashWithdrawalOtp(code: string, secret: string): string {
  return createHash('sha256')
    .update(`${String(code).trim()}:${secret}`)
    .digest('hex');
}
