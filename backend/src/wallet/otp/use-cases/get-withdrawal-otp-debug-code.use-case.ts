import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WITHDRAWAL_OTP_REPOSITORY } from '../../shared/payment.tokens';
import { WithdrawalOtpRepositoryPort } from '../../shared/payment.ports';

@Injectable()
export class GetWithdrawalOtpDebugCodeUseCase {
  constructor(
    @Inject(WITHDRAWAL_OTP_REPOSITORY) private readonly otps: WithdrawalOtpRepositoryPort,
    private readonly config: ConfigService,
  ) {}

  async execute(withdrawalRequestId: string) {
    const debugEnabled = this.config.get<string>('OTP_DEBUG_ENABLED', 'true') === 'true';
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (!debugEnabled || isProduction) {
      throw new ForbiddenException('La consultation temporaire du code OTP est désactivée');
    }

    const otp = await this.otps.findLatestByWithdrawalId(withdrawalRequestId);
    if (!otp) throw new NotFoundException('Aucun OTP trouvé pour cette demande');

    return {
      withdrawalRequestId,
      otpId: otp.id,
      phoneNumber: otp.phoneNumber,
      code: otp.debugCode,
      expiresAt: otp.expiresAt,
      status: otp.status,
      attemptCount: otp.attemptCount,
      maxAttempts: otp.maxAttempts,
      provider: otp.provider,
      providerMessageId: otp.providerMessageId,
      warning: 'Route temporaire réservée au développement mobile. À désactiver en production.',
    };
  }
}
