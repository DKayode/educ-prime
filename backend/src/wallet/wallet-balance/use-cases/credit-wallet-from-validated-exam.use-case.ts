import { Injectable } from '@nestjs/common';
import { RewardSourceTypeCode } from '../../shared/payment.enums';
import { CreditRewardSourceUseCase } from '../../user-payment/use-cases/credit-reward-source.use-case';

export interface CreditWalletFromValidatedExamCommand {
  userId: number;
  examId: string;
  amount?: number;
  currency?: string;
  reference?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Compatibilité avec l'ancienne route interne dédiée aux épreuves.
 *
 * L'ancien endpoint reste disponible pour ne pas casser le module de chargement
 * déjà en production. En interne, il redirige maintenant vers le nouveau cas
 * d'usage générique basé sur RewardSourceType.
 */
@Injectable()
export class CreditWalletFromValidatedExamUseCase {
  constructor(private readonly creditRewardSource: CreditRewardSourceUseCase) {}

  execute(command: CreditWalletFromValidatedExamCommand) {
    return this.creditRewardSource.execute({
      userId: command.userId,
      sourceType: RewardSourceTypeCode.EPREUVE,
      sourceId: command.examId,
      amount: command.amount,
      currency: command.currency,
      // On conserve l'ancien format par défaut pour éviter tout double crédit
      // sur les références déjà créées en production.
      reference: command.reference ?? `EXAM_REWARD:${command.examId}`,
      description: command.description ?? `Récompense épreuve validée ${command.examId}`,
      metadata: {
        examId: command.examId,
        legacyEndpoint: 'internal/payment/exam-rewards/credit',
        ...command.metadata,
      },
    });
  }
}
