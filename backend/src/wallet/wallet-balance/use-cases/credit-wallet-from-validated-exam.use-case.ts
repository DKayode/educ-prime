import { Injectable } from '@nestjs/common';
import { RewardSourceTypeCode } from '../../shared/payment.enums';
import { CreditRewardSourceUseCase } from '../../user-payment/use-cases/credit-reward-source.use-case';

export interface CreditWalletFromValidatedExamCommand {
  userId: number;
  /** Type de contenu récompensé. Absent ⇒ EPREUVE (ancien endpoint interne). */
  sourceType?: RewardSourceTypeCode;
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
    const sourceType = command.sourceType ?? RewardSourceTypeCode.EPREUVE;

    return this.creditRewardSource.execute({
      userId: command.userId,
      sourceType,
      sourceId: command.examId,
      amount: command.amount,
      currency: command.currency,
      // La référence reste `EXAM_REWARD:<uuid>` pour TOUTES les sources, y
      // compris CONCOURS et EXAMEN. Épreuves, concours et examens nationaux ont
      // toujours écrit ce même préfixe : c'est sur lui que porte le contrôle de
      // doublon le plus ancien, et il est vérifié AVANT le contrôle par source.
      // Passer à `CONCOURS_REWARD:` ferait manquer les lignes historiques — et
      // celles-ci sont rétro-marquées EPREUVE par la migration 037, donc le
      // contrôle par source ne les rattraperait pas non plus : ré-approuver un
      // concours déjà payé le paierait une seconde fois.
      reference: command.reference ?? `EXAM_REWARD:${command.examId}`,
      description: command.description ?? `Récompense validée ${command.examId}`,
      metadata: {
        examId: command.examId,
        legacyEndpoint: 'internal/payment/exam-rewards/credit',
        ...command.metadata,
      },
    });
  }
}
