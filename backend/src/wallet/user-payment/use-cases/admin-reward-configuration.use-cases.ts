import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PAYMENT_AUDIT_LOG_PORT, PAYMENT_REWARD_CONFIGURATION_REPOSITORY } from '../../shared/payment.tokens';
import { PaymentAuditLogPort, PaymentRewardConfigurationRepositoryPort } from '../../shared/payment.ports';
import { RewardSourceTypeCode } from '../../shared/payment.enums';
import { UpdateRewardConfigurationDto } from '../dto/update-reward-configuration.dto';

@Injectable()
export class ListRewardConfigurationsUseCase {
  constructor(
    @Inject(PAYMENT_REWARD_CONFIGURATION_REPOSITORY)
    private readonly configurations: PaymentRewardConfigurationRepositoryPort,
  ) {}

  async execute() {
    await this.configurations.ensureDefaults();
    return this.configurations.findAll();
  }
}

@Injectable()
export class GetRewardConfigurationUseCase {
  constructor(
    @Inject(PAYMENT_REWARD_CONFIGURATION_REPOSITORY)
    private readonly configurations: PaymentRewardConfigurationRepositoryPort,
  ) {}

  execute(sourceType: string) {
    return this.configurations.getActiveBySourceTypeCode(this.normalizeSourceType(sourceType));
  }

  private normalizeSourceType(sourceType: string): RewardSourceTypeCode {
    const normalized = String(sourceType ?? '').trim().toUpperCase() as RewardSourceTypeCode;
    if (!Object.values(RewardSourceTypeCode).includes(normalized)) {
      throw new BadRequestException(`sourceType invalide. Valeurs acceptées : ${Object.values(RewardSourceTypeCode).join(', ')}`);
    }
    return normalized;
  }
}

@Injectable()
export class UpdateRewardConfigurationUseCase {
  constructor(
    @Inject(PAYMENT_REWARD_CONFIGURATION_REPOSITORY)
    private readonly configurations: PaymentRewardConfigurationRepositoryPort,
    @Inject(PAYMENT_AUDIT_LOG_PORT)
    private readonly audit: PaymentAuditLogPort,
  ) {}

  async execute(sourceType: string, adminId: number, dto: UpdateRewardConfigurationDto) {
    const normalized = this.normalizeSourceType(sourceType);
    const updated = await this.configurations.updateBySourceTypeCode(normalized, dto, adminId);

    await this.audit.log({
      adminId,
      action: 'REWARD_CONFIGURATION_UPDATED',
      entity: 'PaymentRewardConfiguration',
      entityId: updated.id,
      newValue: { sourceType: normalized, ...dto },
    });

    return updated;
  }

  private normalizeSourceType(sourceType: string): RewardSourceTypeCode {
    const normalized = String(sourceType ?? '').trim().toUpperCase() as RewardSourceTypeCode;
    if (!Object.values(RewardSourceTypeCode).includes(normalized)) {
      throw new BadRequestException(`sourceType invalide. Valeurs acceptées : ${Object.values(RewardSourceTypeCode).join(', ')}`);
    }
    return normalized;
  }
}
