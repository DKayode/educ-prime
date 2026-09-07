import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class PaiementCredentialsService {
  constructor(private readonly config: ConfigService) {}

  encrypt(credentials: Record<string, string>): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (value == null || value === '') continue;
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
      const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      encrypted[key] = `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
    }
    return encrypted;
  }

  decrypt(credentials: Record<string, string> | null | undefined): Record<string, string> {
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials ?? {})) {
      const [iv, tag, ciphertext] = String(value).split('.');
      if (!iv || !tag || !ciphertext) continue;
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(iv, 'base64'));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      decrypted[key] = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    }
    return decrypted;
  }

  mask(credentials: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (!value) continue;
      masked[key] = value.length <= 8 ? '********' : `${value.slice(0, 4)}...${value.slice(-4)}`;
    }
    return masked;
  }

  private key(): Buffer {
    const secret = this.config.get<string>('PAIEMENT_CREDENTIALS_SECRET')
      ?? this.config.get<string>('JWT_SECRET')
      ?? 'edukia-paiements-dev-secret';
    return createHash('sha256').update(secret).digest();
  }
}
