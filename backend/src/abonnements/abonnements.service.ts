import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ActiverAbonnementDto } from './dto/activer-abonnement.dto';
import { FilterAbonnementDto } from './dto/filter-abonnement.dto';
import { ProlongerAbonnementDto } from './dto/prolonger-abonnement.dto';
import { SouscrireDto } from './dto/souscrire.dto';
import { AbonnementEvenement, TypeEvenementAbonnement } from './entities/abonnement-evenement.entity';
import { Abonnement, StatutAbonnement } from './entities/abonnement.entity';
import { EntitlementService } from './entitlement.service';
import { ParrainageService } from './parrainage.service';
import { PlansService } from './plans.service';

@Injectable()
export class AbonnementsService {
  private readonly logger = new Logger(AbonnementsService.name);

  constructor(
    @InjectRepository(Abonnement) private readonly abonnements: Repository<Abonnement>,
    @InjectRepository(AbonnementEvenement) private readonly evenementsRepository: Repository<AbonnementEvenement>,
    private readonly plansService: PlansService,
    private readonly entitlement: EntitlementService,
    private readonly parrainage: ParrainageService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ouvre un abonnement EN_ATTENTE. Il ne devient ACTIF qu'au paiement (#248)
   * ou par activation manuelle d'un admin.
   */
  async souscrire(pays: string, utilisateurId: number, dto: SouscrireDto): Promise<Abonnement> {
    const plan = await this.plansService.findByUuid(dto.plan_uuid);
    if (!plan.est_actif) {
      throw new ConflictException("Ce plan n'est pas disponible");
    }

    if (await this.entitlement.hasActiveSubscription(utilisateurId, pays)) {
      throw new ConflictException('Vous avez déjà un abonnement actif');
    }

    // Une souscription en attente est réutilisée plutôt que dupliquée : sans
    // cela, chaque passage sur l'écran de paiement laisserait une ligne morte.
    const enAttente = await this.abonnements.findOne({
      where: { utilisateur_id: utilisateurId, statut: StatutAbonnement.EN_ATTENTE },
      order: { date_creation: 'DESC' },
    });
    if (enAttente) {
      enAttente.plan_id = plan.id;
      enAttente.devise = plan.devise;
      // Un code saisi au second passage doit être pris en compte.
      enAttente.parrain_id =
        enAttente.parrain_id ?? (await this.parrainage.resoudreParrain(utilisateurId, dto.code_parrainage));
      const rafraichi = await this.abonnements.save(enAttente);
      return this.findByUuid(rafraichi.uuid);
    }

    // Le parrain est figé maintenant, pas au paiement : entre les deux, la
    // relation de parrainage pourrait changer et attribuer la commission à
    // quelqu'un qui n'a rien amené.
    const parrainId = await this.parrainage.resoudreParrain(utilisateurId, dto.code_parrainage);

    const abonnement = await this.abonnements.save(
      this.abonnements.create({
        pays,
        utilisateur_id: utilisateurId,
        plan_id: plan.id,
        statut: StatutAbonnement.EN_ATTENTE,
        montant_paye: 0,
        devise: plan.devise,
        parrain_id: parrainId,
      }),
    );

    await this.journaliser(abonnement.id, TypeEvenementAbonnement.CREE, {
      planCode: plan.code,
      prix: plan.prix,
      parrainId,
    });
    this.logger.log(`Abonnement ${abonnement.uuid} créé (EN_ATTENTE) pour utilisateur ${utilisateurId}`);
    return this.findByUuid(abonnement.uuid);
  }

  /**
   * Active un abonnement payé.
   *
   * L'unicité de l'abonnement ACTIF est portée par un index partiel : deux
   * activations concurrentes lèvent une violation d'unicité plutôt que d'ouvrir
   * deux abonnements. On la traduit en 409 explicite.
   */
  async activer(uuid: string, dto: ActiverAbonnementDto, adminId?: number): Promise<Abonnement> {
    const abonnement = await this.findByUuid(uuid);

    if (abonnement.statut === StatutAbonnement.ACTIF) {
      throw new ConflictException('Cet abonnement est déjà actif');
    }
    if ([StatutAbonnement.ANNULE, StatutAbonnement.REMBOURSE].includes(abonnement.statut)) {
      throw new ConflictException(`Un abonnement ${abonnement.statut} ne peut pas être activé`);
    }

    const debut = new Date();
    const fin = new Date(debut.getTime() + abonnement.plan.duree_jours * 24 * 60 * 60 * 1000);

    abonnement.statut = StatutAbonnement.ACTIF;
    abonnement.date_debut = debut;
    abonnement.date_fin = fin;
    abonnement.montant_paye = dto.montant_paye;
    abonnement.metadata = {
      ...(abonnement.metadata ?? {}),
      activation_manuelle: true,
      reference_paiement: dto.reference_paiement ?? null,
      commentaire: dto.commentaire ?? null,
      active_par: adminId ?? null,
    };

    let sauvegarde: Abonnement;
    try {
      sauvegarde = await this.abonnements.save(abonnement);
    } catch (err) {
      if (String(err?.code) === '23505') {
        throw new ConflictException('Cet utilisateur a déjà un abonnement actif');
      }
      throw err;
    }

    await this.journaliser(sauvegarde.id, TypeEvenementAbonnement.PAYE, {
      montant: dto.montant_paye,
      reference: dto.reference_paiement ?? null,
      manuel: true,
    });
    await this.journaliser(sauvegarde.id, TypeEvenementAbonnement.ACTIVE, {
      date_debut: debut,
      date_fin: fin,
    });

    this.logger.log(`Abonnement ${uuid} activé jusqu'au ${fin.toISOString()} (activation manuelle)`);

    // Best-effort et HORS de ce qui précède : un échec de commission ne doit pas
    // annuler un abonnement déjà payé. Les abonnements restés à
    // `commission_versee = false` sont rattrapables depuis le back-office.
    const commission = await this.parrainage.verserCommission(await this.findByUuid(uuid));
    if (commission.verse) {
      await this.journaliser(sauvegarde.id, TypeEvenementAbonnement.COMMISSION_VERSEE, {
        parrainId: sauvegarde.parrain_id,
        montantAbonnement: dto.montant_paye,
      });
    }

    return this.findByUuid(uuid);
  }

  /**
   * Rattrape une commission non versée.
   *
   * Utile quand le wallet du parrain était bloqué au moment de l'activation, ou
   * quand la commission a été activée après coup.
   */
  async rattraperCommission(uuid: string) {
    const abonnement = await this.findByUuid(uuid);
    if (abonnement.statut !== StatutAbonnement.ACTIF) {
      throw new BadRequestException('Seul un abonnement actif ouvre droit à une commission');
    }
    const resultat = await this.parrainage.verserCommission(abonnement);
    if (resultat.verse) {
      await this.journaliser(abonnement.id, TypeEvenementAbonnement.COMMISSION_VERSEE, {
        parrainId: abonnement.parrain_id,
        rattrapage: true,
      });
    }
    return resultat;
  }

  /** Abonnements payés dont la commission n'est pas passée. */
  async commissionsEnAttente(pays: string) {
    return this.abonnements.find({
      where: { pays, statut: StatutAbonnement.ACTIF, commission_versee: false },
      order: { date_creation: 'DESC' },
      take: 100,
    }).then((lignes) => lignes.filter((a) => a.parrain_id !== null));
  }

  async annuler(uuid: string, motif?: string): Promise<Abonnement> {
    const abonnement = await this.findByUuid(uuid);
    if ([StatutAbonnement.ANNULE, StatutAbonnement.REMBOURSE].includes(abonnement.statut)) {
      throw new ConflictException(`Cet abonnement est déjà ${abonnement.statut}`);
    }
    abonnement.statut = StatutAbonnement.ANNULE;
    const sauvegarde = await this.abonnements.save(abonnement);
    await this.journaliser(sauvegarde.id, TypeEvenementAbonnement.ANNULE, { motif: motif ?? null });
    return this.findByUuid(uuid);
  }

  async prolonger(uuid: string, dto: ProlongerAbonnementDto): Promise<Abonnement> {
    const abonnement = await this.findByUuid(uuid);
    if (abonnement.statut !== StatutAbonnement.ACTIF) {
      throw new BadRequestException('Seul un abonnement actif peut être prolongé');
    }
    const base = abonnement.date_fin > new Date() ? abonnement.date_fin : new Date();
    abonnement.date_fin = new Date(base.getTime() + dto.jours * 24 * 60 * 60 * 1000);
    const sauvegarde = await this.abonnements.save(abonnement);
    await this.journaliser(sauvegarde.id, TypeEvenementAbonnement.PROLONGE, {
      jours: dto.jours,
      motif: dto.motif ?? null,
      nouvelle_date_fin: abonnement.date_fin,
    });
    return this.findByUuid(uuid);
  }

  /** Abonnement courant de l'utilisateur, actif de préférence, sinon en attente. */
  async monAbonnement(utilisateurId: number, pays = 'benin'): Promise<Abonnement | null> {
    const actif = await this.entitlement.abonnementActif(utilisateurId, pays);
    if (actif) return actif;
    return this.abonnements.findOne({
      where: { utilisateur_id: utilisateurId, pays, statut: StatutAbonnement.EN_ATTENTE },
      order: { date_creation: 'DESC' },
    });
  }

  async mesAbonnements(utilisateurId: number, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const [data, total] = await this.abonnements.findAndCount({
      where: { utilisateur_id: utilisateurId },
      order: { date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(pays: string, filtre: FilterAbonnementDto) {
    const page = filtre.page ?? 1;
    const limit = filtre.limit ?? 10;

    const qb = this.abonnements
      .createQueryBuilder('abonnement')
      .leftJoinAndSelect('abonnement.plan', 'plan')
      .leftJoin('abonnement.utilisateur', 'utilisateur')
      .addSelect(['utilisateur.id', 'utilisateur.uuid', 'utilisateur.nom', 'utilisateur.prenom', 'utilisateur.email'])
      .where('abonnement.pays = :pays', { pays });

    if (filtre.statut) qb.andWhere('abonnement.statut = :statut', { statut: filtre.statut });
    if (filtre.plan_code) qb.andWhere('plan.code = :code', { code: filtre.plan_code.toUpperCase() });
    if (filtre.search) {
      qb.andWhere(
        '(utilisateur.nom ILIKE :q OR utilisateur.prenom ILIKE :q OR utilisateur.email ILIKE :q)',
        { q: `%${filtre.search}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('abonnement.date_creation', filtre.sort_order === 'ASC' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByUuid(uuid: string): Promise<Abonnement> {
    const abonnement = await this.abonnements.findOne({ where: { uuid } });
    if (!abonnement) throw new NotFoundException('Abonnement introuvable');
    return abonnement;
  }

  /** Journal d'un abonnement, du plus récent au plus ancien. */
  async historique(uuid: string): Promise<AbonnementEvenement[]> {
    const abonnement = await this.findByUuid(uuid);
    return this.evenementsRepository.find({
      where: { abonnement_id: abonnement.id },
      order: { date_creation: 'DESC' },
    });
  }

  /** Le journal ne doit jamais faire échouer l'opération qu'il décrit. */
  async journaliser(
    abonnementId: number,
    type: TypeEvenementAbonnement,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.evenementsRepository.save(
        this.evenementsRepository.create({ abonnement_id: abonnementId, type, payload: payload ?? null }),
      );
    } catch (err) {
      this.logger.warn(`Journalisation ${type} échouée pour l'abonnement ${abonnementId}: ${err?.message ?? err}`);
    }
  }

  /**
   * Bascule les abonnements arrivés à échéance.
   *
   * L'EntitlementService ne dépend PAS de ce cron — il compare déjà `date_fin`
   * à l'instant présent. Le cron matérialise le statut pour le back-office et
   * les KPI, et déclenche la notification.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expirerAbonnements(): Promise<number> {
    const echus = await this.entitlement.abonnementsAExpirer();
    if (!echus.length) return 0;

    for (const abonnement of echus) {
      abonnement.statut = StatutAbonnement.EXPIRE;
      await this.abonnements.save(abonnement);
      await this.journaliser(abonnement.id, TypeEvenementAbonnement.EXPIRE, {
        date_fin: abonnement.date_fin,
      });
    }

    this.logger.log(`${echus.length} abonnement(s) passé(s) à EXPIRE`);
    return echus.length;
  }
}
