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
import { ModuleRef } from '@nestjs/core';
import { CodeValidationService } from '../codes/code-validation.service';
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
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Résolution tardive : CodesModule importe AbonnementsModule pour PlansService,
   * l'inverse ne peut donc pas être une arête du graphe de modules.
   */
  private get codes(): CodeValidationService {
    return this.moduleRef.get(CodeValidationService, { strict: false });
  }

  /**
   * Ouvre un abonnement EN_ATTENTE. Il ne devient ACTIF qu'au paiement (#248)
   * ou par activation manuelle d'un admin.
   */
  async souscrire(pays: string, utilisateurId: number, dto: SouscrireDto): Promise<Abonnement> {
    const plan = await this.plansService.findByUuid(dto.plan_uuid);
    if (!plan.est_actif) {
      throw new ConflictException("Ce plan n'est pas disponible");
    }

    if (await this.entitlement.hasActiveSubscription(utilisateurId)) {
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
      // Un code saisi au second passage doit être pris en compte : on libère la
      // souscription en attente pour repartir d'une résolution propre.
      await this.codes.libererPourAbonnement(enAttente.id);
      await this.abonnements.update(enAttente.id, { code_id: null, montant_remise: 0 });
      const rafraichi = await this.abonnements.save(enAttente);
      return this.findByUuid(rafraichi.uuid);
    }

    const codeSaisi = dto.code ?? dto.code_parrainage;

    // Un seul code, plusieurs effets possibles : remise, commission, abonnement
    // offert. C'est le registre qui les porte — le module abonnements se
    // contente de les appliquer.
    const resultat = codeSaisi
      ? await this.codes.valider(codeSaisi, utilisateurId, { planId: plan.id, prix: plan.prix, pays })
      : null;
    const codeValide = resultat?.valide ? resultat : null;

    if (codeSaisi && !codeValide) {
      // Refus silencieux : bloquer un paiement pour une faute de frappe sur un
      // champ facultatif serait absurde. `code_id: null` en dit assez au client.
      this.logger.log(`Code « ${codeSaisi} » ignoré pour l'utilisateur ${utilisateurId} : ${resultat?.motif}`);
    }

    const effets = codeValide?.effets ?? {};
    const remise = effets.remise?.montant_remise ?? 0;
    const offert = !!effets.abonnement_offert;

    // Le bénéficiaire est figé maintenant, pas au paiement : entre les deux, le
    // code pourrait être désactivé ou changer de propriétaire. Un abonnement
    // offert n'encaisse rien, donc ne verse aucune commission.
    const parrainId = offert ? null : effets.commission_pour ?? null;

    const abonnement = await this.dataSource.transaction(async (manager) => {
      // L'ORDRE COMPTE. Le verrou sur le code se prend AVANT d'insérer
      // l'abonnement : l'insertion prend un FOR KEY SHARE sur la ligne de
      // `codes` via la clé étrangère, et l'élever ensuite en FOR UPDATE
      // provoque un interblocage dès deux acheteurs simultanés — observé sur le
      // devstack avec 10 requêtes parallèles.
      let codeRetenu = codeValide?.code ?? null;
      if (codeRetenu) {
        const verrou = await this.codes.verrouillerEtValider(manager, codeRetenu.id, utilisateurId);
        if (!verrou.ok) {
          // La place a été prise entre l'aperçu et l'achat : on souscrit sans le
          // code plutôt que d'échouer un paiement.
          this.logger.warn(`Code ${codeRetenu.code} indisponible : ${verrou.motif}`);
          codeRetenu = null;
        }
      }
      const retenu = !!codeRetenu;
      const remiseRetenue = retenu ? remise : 0;
      const offertRetenu = retenu && offert;

      // Un abonnement offert est ACTIF d'emblée : il n'y a rien à encaisser, et
      // le laisser EN_ATTENTE obligerait un admin à confirmer un paiement qui
      // n'aura jamais lieu.
      const debut = offertRetenu ? new Date() : null;
      const duree = effets.abonnement_offert?.duree_jours ?? plan.duree_jours;
      const fin = offertRetenu ? new Date(debut!.getTime() + duree * 24 * 60 * 60 * 1000) : null;

      const cree = await manager.getRepository(Abonnement).save(
        manager.getRepository(Abonnement).create({
          pays,
          utilisateur_id: utilisateurId,
          plan_id: plan.id,
          statut: offertRetenu ? StatutAbonnement.ACTIF : StatutAbonnement.EN_ATTENTE,
          date_debut: debut,
          date_fin: fin,
          montant_paye: 0,
          montant_remise: remiseRetenue,
          offert: offertRetenu,
          devise: plan.devise,
          parrain_id: retenu ? parrainId : null,
          code_id: codeRetenu?.id ?? null,
        }),
      );

      if (codeRetenu) {
        await this.codes.enregistrerUtilisation(manager, codeRetenu.id, utilisateurId, {
          abonnementId: cree.id,
          montantRemise: remiseRetenue,
          pays,
          effets,
        });
      }
      return cree;
    });

    await this.journaliser(abonnement.id, TypeEvenementAbonnement.CREE, {
      planCode: plan.code,
      prix: plan.prix,
      parrainId: abonnement.parrain_id,
      code: abonnement.code_id ? codeValide?.code?.code : null,
      montantRemise: abonnement.montant_remise,
      offert: abonnement.offert,
    });

    if (abonnement.offert) {
      await this.journaliser(abonnement.id, TypeEvenementAbonnement.ACTIVE, {
        offert: true,
        code: codeValide?.code?.code,
        date_fin: abonnement.date_fin,
      });
    }

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
    // Rendre la place : sans cela, les codes d'une campagne limitée partiraient
    // en paniers abandonnés.
    await this.codes.libererPourAbonnement(sauvegarde.id);
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
  async monAbonnement(utilisateurId: number): Promise<Abonnement | null> {
    const actif = await this.entitlement.abonnementActif(utilisateurId);
    if (actif) return actif;
    return this.abonnements.findOne({
      where: { utilisateur_id: utilisateurId, statut: StatutAbonnement.EN_ATTENTE },
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
