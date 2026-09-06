import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { RoleType, Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { Abonnement, StatutAbonnement } from './entities/abonnement.entity';

/** Droits que l'application sait arbitrer. #245, #247 et #249 en ajouteront. */
export enum Feature {
  CONCOURS_DOWNLOAD = 'CONCOURS_DOWNLOAD',
  EPREUVE_VIEW = 'EPREUVE_VIEW',
  EXAMEN_NAT_VIEW = 'EXAMEN_NAT_VIEW',
  KETSIA_AI = 'KETSIA_AI',
  AI_STATS = 'AI_STATS',
}

export type MotifDecision =
  | 'SUBSCRIBED'
  | 'ADMIN'
  | 'FREE_QUOTA'
  | 'QUOTA_EXCEEDED'
  | 'SUBSCRIPTION_REQUIRED';

export interface DecisionDroit {
  allowed: boolean;
  reason: MotifDecision;
  quota?: { used: number; limit: number };
  abonnement?: { planCode: string; dateFin: Date };
}

/**
 * Arbitre unique des droits liés à l'abonnement.
 *
 * Sans effet de bord et bon marché : une requête indexée sur
 * (utilisateur_id, statut, date_fin). Les appelants décident eux-mêmes de
 * consommer un quota — `check()` ne compte rien, il constate.
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectRepository(Abonnement) private readonly abonnements: Repository<Abonnement>,
    @InjectRepository(Utilisateur) private readonly utilisateurs: Repository<Utilisateur>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Interrupteur de mise en service. À `false` — le défaut — le guard laisse
   * passer et journalise ce qu'il aurait refusé : on mesure l'impact avant de
   * couper un accès qui existe aujourd'hui.
   */
  get verrouActif(): boolean {
    return String(this.config.get('ABONNEMENTS_VERROU_ACTIF') ?? 'false').toLowerCase() === 'true';
  }

  /** Abonnement ACTIF dont la date de fin n'est pas passée. */
  async abonnementActif(utilisateurId: number): Promise<Abonnement | null> {
    if (!utilisateurId) return null;
    return this.abonnements.findOne({
      where: {
        utilisateur_id: utilisateurId,
        statut: StatutAbonnement.ACTIF,
        // Un ACTIF dont la date est dépassée est lu comme expiré ici ; c'est le
        // cron qui écrit le statut. Ne pas dépendre du cron pour refuser.
        date_fin: MoreThan(new Date()),
      },
    });
  }

  async hasActiveSubscription(utilisateurId: number): Promise<boolean> {
    return (await this.abonnementActif(utilisateurId)) !== null;
  }

  /**
   * Le rôle voyage déjà dans le JWT (`req.user.role`) : quand l'appelant le
   * fournit, on s'épargne un aller-retour SQL. Sur une base distante, cette
   * requête coûtait autant que la question qu'on cherche vraiment à poser.
   */
  async estAdmin(utilisateurId: number, role?: string): Promise<boolean> {
    if (role !== undefined) return role === RoleType.ADMIN;
    if (!utilisateurId) return false;
    const user = await this.utilisateurs.findOne({
      where: { id: utilisateurId },
      select: ['id', 'role'],
    });
    return user?.role === RoleType.ADMIN;
  }

  /**
   * Décision pour une feature. Les quotas gratuits (#245) se brancheront ici :
   * ce point d'entrée ne changera pas pour les appelants.
   */
  async check(utilisateurId: number, feature: Feature, role?: string): Promise<DecisionDroit> {
    // Le back-office ne doit jamais être bloqué par un abonnement.
    if (await this.estAdmin(utilisateurId, role)) {
      return { allowed: true, reason: 'ADMIN' };
    }

    const abonnement = await this.abonnementActif(utilisateurId);
    if (abonnement) {
      return {
        allowed: true,
        reason: 'SUBSCRIBED',
        abonnement: { planCode: abonnement.plan?.code, dateFin: abonnement.date_fin },
      };
    }

    return { allowed: false, reason: 'SUBSCRIPTION_REQUIRED' };
  }

  /** Décision par feature, pour que le mobile grise son interface sans se prendre un 403. */
  async mesDroits(utilisateurId: number, role?: string): Promise<Record<Feature, DecisionDroit>> {
    const features = Object.values(Feature);
    // Une seule décision calculée puis dupliquée : toutes les fonctionnalités
    // partagent aujourd'hui la même règle. Cinq appels à `check()` feraient
    // cinq fois la même requête. #245 réintroduira une décision par
    // fonctionnalité quand les quotas différeront.
    const decision = await this.check(utilisateurId, Feature.CONCOURS_DOWNLOAD, role);
    return features.reduce(
      (acc, f) => ({ ...acc, [f]: { ...decision } }),
      {} as Record<Feature, DecisionDroit>,
    );
  }

  /** Abonnements ACTIF dont la date de fin est passée — matière du cron. */
  async abonnementsAExpirer(): Promise<Abonnement[]> {
    return this.abonnements.find({
      where: { statut: StatutAbonnement.ACTIF, date_fin: LessThan(new Date()) },
    });
  }
}
