import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RoleType, Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { RewardSourceTypeCode, WalletStatus } from '../wallet/shared/payment.enums';
import { CreditRewardSourceUseCase } from '../wallet/user-payment/use-cases/credit-reward-source.use-case';
import { Abonnement } from './entities/abonnement.entity';

/** Motif de non-versement, journalisé pour que l'absence de commission s'explique. */
export type MotifRefusCommission =
  | 'AUCUN_PARRAIN'
  | 'DEJA_VERSEE'
  | 'AUTO_PARRAINAGE'
  | 'PARRAIN_INTROUVABLE'
  | 'PARRAIN_DESACTIVE'
  | 'WALLET_INDISPONIBLE';

@Injectable()
export class ParrainageService {
  private readonly logger = new Logger(ParrainageService.name);

  constructor(
    @InjectRepository(Abonnement) private readonly abonnements: Repository<Abonnement>,
    @InjectRepository(Utilisateur) private readonly utilisateurs: Repository<Utilisateur>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Résolution TARDIVE du use-case de crédit.
   *
   * Importer WalletModule ici fermerait un cycle réel :
   * WalletModule → UtilisateursModule → FichiersModule → FilesModule →
   * AbonnementsModule (FilesModule dépend des droits depuis #245).
   * `forwardRef` ne suffit pas — le maillon indéfini est à l'intérieur du
   * wallet. Le résoudre au moment de l'appel supprime l'arête du graphe de
   * modules sans déplacer le versement de commission dans le wallet, qui n'a
   * pas à connaître les abonnements.
   */
  private get creditRewardSource(): CreditRewardSourceUseCase {
    return this.moduleRef.get(CreditRewardSourceUseCase, { strict: false });
  }

  /**
   * Parrain à créditer pour une souscription.
   *
   * La relation posée à l'inscription (`utilisateurs.parrain_id`) fait foi. Un
   * code saisi au moment de la souscription ne sert qu'à un utilisateur qui
   * n'avait PAS de parrain : réécrire la relation d'inscription confondrait une
   * donnée d'acquisition avec un geste commercial.
   */
  async resoudreParrain(utilisateurId: number, codeSaisi?: string): Promise<number | null> {
    const filleul = await this.utilisateurs.findOne({
      where: { id: utilisateurId },
      relations: ['parrain'],
      select: { id: true, parrain: { id: true } } as any,
    });

    const parrainExistant = (filleul as any)?.parrain?.id ?? null;
    if (parrainExistant) return parrainExistant === utilisateurId ? null : parrainExistant;

    if (!codeSaisi) return null;

    const parrain = await this.utilisateurs.findOne({
      where: { mon_code_parrainage: codeSaisi.trim().toUpperCase() },
      select: ['id'],
    });
    if (!parrain || parrain.id === utilisateurId) return null;
    return parrain.id;
  }

  /**
   * Verse la commission au parrain d'un abonnement activé.
   *
   * **Best-effort, comme partout ailleurs dans ce dépôt** : un échec ne doit
   * jamais faire échouer l'activation d'un abonnement déjà payé. Les abonnements
   * restés à `commission_versee = false` sont rattrapables depuis le back-office.
   */
  async verserCommission(abonnement: Abonnement): Promise<{ verse: boolean; motif?: MotifRefusCommission }> {
    const refus = await this.motifDeRefus(abonnement);
    if (refus) {
      this.logger.log(`Commission non versée pour l'abonnement ${abonnement.uuid} : ${refus}`);
      return { verse: false, motif: refus };
    }

    try {
      const resultat = await this.creditRewardSource.execute({
        userId: abonnement.parrain_id,
        sourceType: RewardSourceTypeCode.PARRAINAGE_ABONNEMENT,
        // ⚠️ L'identifiant de l'ABONNEMENT, jamais celui du filleul ni du
        // parrain. Le use-case déduplique sur (wallet, sourceType, sourceId) :
        // avec l'id du filleul, le second parrainage serait silencieusement
        // avalé ; avec celui de l'abonnement, un webhook rejoué ne crédite pas
        // deux fois et deux filleuls créditent bien deux fois.
        sourceId: abonnement.uuid,
        baseAmount: Number(abonnement.montant_paye),
        reference: `PARRAINAGE_ABONNEMENT_REWARD:${abonnement.uuid}`,
        description: `Commission de parrainage — abonnement ${abonnement.uuid}`,
        metadata: {
          filleulId: abonnement.utilisateur_id,
          abonnementUuid: abonnement.uuid,
          montantAbonnement: Number(abonnement.montant_paye),
          planCode: abonnement.plan?.code ?? null,
        },
      });

      if (resultat?.duplicated) {
        this.logger.warn(`Commission déjà créditée pour ${abonnement.uuid} (${resultat.reason})`);
      }

      await this.abonnements.update(abonnement.id, { commission_versee: true });
      return { verse: true };
    } catch (err) {
      // Commission désactivée, taux à zéro, plafond atteint : autant de refus
      // légitimes du wallet. Ils ne doivent pas remonter jusqu'à l'admin qui
      // vient d'encaisser un paiement.
      this.logger.warn(
        `Versement de commission impossible pour ${abonnement.uuid}: ${err?.message ?? err}`,
      );
      return { verse: false };
    }
  }

  private async motifDeRefus(abonnement: Abonnement): Promise<MotifRefusCommission | null> {
    if (!abonnement.parrain_id) return 'AUCUN_PARRAIN';
    if (abonnement.commission_versee) return 'DEJA_VERSEE';
    if (abonnement.parrain_id === abonnement.utilisateur_id) return 'AUTO_PARRAINAGE';

    const parrain = await this.utilisateurs.findOne({
      where: { id: abonnement.parrain_id },
      select: ['id', 'est_desactive'],
    });
    if (!parrain) return 'PARRAIN_INTROUVABLE';
    if (parrain.est_desactive) return 'PARRAIN_DESACTIVE';

    // Un wallet bloqué ou clos ne peut rien recevoir : créditer produirait une
    // ligne que le parrain ne pourra jamais retirer.
    const [wallet] = await this.dataSource.query(
      `SELECT status FROM wallets WHERE user_id = $1 LIMIT 1`,
      [abonnement.parrain_id],
    );
    if (wallet && [WalletStatus.BLOCKED, WalletStatus.CLOSED].includes(wallet.status)) {
      return 'WALLET_INDISPONIBLE';
    }

    return null;
  }

  /** Vue « mes parrainages » : filleuls, abonnements payants, commissions perçues. */
  async mesParrainages(utilisateurId: number) {
    const [filleuls] = await Promise.all([
      this.utilisateurs.find({
        where: { parrain: { id: utilisateurId } } as any,
        select: ['id', 'uuid', 'nom', 'prenom', 'date_creation'],
        order: { date_creation: 'DESC' },
        take: 100,
      }),
    ]);

    const [totaux] = await this.dataSource.query(
      `SELECT COALESCE(SUM(wt.amount), 0)::float AS total, COUNT(*)::int AS nombre
         FROM wallet_transactions wt
         JOIN wallets w ON w.id = wt.wallet_id
        WHERE w.user_id = $1
          AND wt.reward_source_type_code = $2
          AND wt.status <> 'CANCELLED'`,
      [utilisateurId, RewardSourceTypeCode.PARRAINAGE_ABONNEMENT],
    );

    const abonnes = await this.abonnements.count({
      where: { parrain_id: utilisateurId, commission_versee: true },
    });

    return {
      // Le code du parrain est déjà exposé par /utilisateurs/code-parrainage ;
      // on ne le duplique pas ici.
      filleuls: filleuls.map((f) => ({
        uuid: f.uuid,
        nom: f.nom,
        prenom: f.prenom,
        inscrit_le: f.date_creation,
      })),
      nombre_filleuls: filleuls.length,
      filleuls_abonnes: abonnes,
      commissions: {
        nombre: Number(totaux?.nombre ?? 0),
        total: Number(totaux?.total ?? 0),
      },
    };
  }
}
