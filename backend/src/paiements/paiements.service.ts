import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AbonnementsService } from '../abonnements/abonnements.service';
import { Abonnement, StatutAbonnement } from '../abonnements/entities/abonnement.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { ConfigurationPaiement } from './entities/configuration-paiement.entity';
import { PaiementWebhook } from './entities/paiement-webhook.entity';
import { Paiement } from './entities/paiement.entity';
import { FilterPaiementsDto } from './dto/filter-paiements.dto';
import { InitierPaiementDto } from './dto/initier-paiement.dto';
import { PaiementProviderRegistry } from './providers/paiement-provider.registry';
import { MethodePaiement, PrestatairePaiement, StatutPaiement } from './shared/paiement.enums';

const STATUTS_FINAUX = new Set([StatutPaiement.REUSSI, StatutPaiement.ECHOUE, StatutPaiement.ANNULE, StatutPaiement.EXPIRE, StatutPaiement.REMBOURSE]);

@Injectable()
export class PaiementsService {
  private readonly logger = new Logger(PaiementsService.name);

  constructor(
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    @InjectRepository(PaiementWebhook) private readonly webhooks: Repository<PaiementWebhook>,
    @InjectRepository(ConfigurationPaiement) private readonly configurations: Repository<ConfigurationPaiement>,
    @InjectRepository(Abonnement) private readonly abonnements: Repository<Abonnement>,
    @InjectRepository(Utilisateur) private readonly utilisateurs: Repository<Utilisateur>,
    private readonly providers: PaiementProviderRegistry,
    private readonly abonnementsService: AbonnementsService,
    private readonly dataSource: DataSource,
  ) {}

  async initier(pays: string, utilisateurId: number, dto: InitierPaiementDto) {
    const abonnement = await this.abonnements.findOne({ where: { uuid: dto.abonnement_uuid, utilisateur_id: utilisateurId, pays } });
    if (!abonnement) throw new NotFoundException('Abonnement introuvable');
    if (abonnement.statut !== StatutAbonnement.EN_ATTENTE) {
      throw new ConflictException("Seul un abonnement en attente peut être payé");
    }

    const config = await this.configurationActive(pays, dto.prestataire);
    const montant = Number(abonnement.plan.prix) - Number((abonnement as any).montant_remise ?? 0);
    if (montant <= 0) throw new ConflictException("Cet abonnement ne nécessite pas de paiement");
    this.verifierPlafonds(config, montant);

    const utilisateur = await this.utilisateurs.findOne({ where: { id: utilisateurId } });
    if (!utilisateur) throw new NotFoundException('Utilisateur introuvable');

    const provider = this.providers.get(config.prestataire);
    const reference = `EDK-${Date.now()}-${utilisateurId}-${abonnement.id}`;
    const expiration = new Date(Date.now() + 30 * 60 * 1000);
    const paiement = await this.paiements.save(this.paiements.create({
      pays,
      reference,
      utilisateur_id: utilisateurId,
      abonnement_id: abonnement.id,
      montant,
      devise: config.devise,
      prestataire: config.prestataire,
      methode: dto.methode ?? MethodePaiement.MOBILE_MONEY,
      statut: StatutPaiement.INITIE,
      date_expiration: expiration,
    }));

    const baseUrl = process.env.PAIEMENT_WEBHOOK_BASE_URL ?? process.env.FRONTEND_URL ?? '';
    const retour = `${process.env.FRONTEND_URL ?? ''}/abonnements?paiement=${paiement.uuid}`;
    const resultat = await provider.initier({
      reference,
      montant,
      devise: config.devise,
      client: {
        nom: [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(' ') || utilisateur.email,
        email: utilisateur.email,
        telephone: dto.telephone ?? utilisateur.telephone,
      },
      urlRetour: retour,
      urlWebhook: `${baseUrl}/paiements/webhooks/${config.prestataire.toLowerCase()}`,
      metadata: { paiementUuid: paiement.uuid, abonnementUuid: abonnement.uuid },
    });

    paiement.statut = StatutPaiement.EN_ATTENTE;
    paiement.reference_prestataire = resultat.referencePrestataire;
    paiement.url_paiement = resultat.urlPaiement ?? null;
    paiement.token_client = resultat.tokenClient ?? null;
    paiement.payload_initiation = resultat.payload as any;
    const sauvegarde = await this.paiements.save(paiement);
    await this.abonnements.update(abonnement.id, { paiement_id: sauvegarde.id });
    return sauvegarde;
  }

  async findOne(pays: string, utilisateurId: number, uuid: string) {
    const paiement = await this.paiements.findOne({ where: { uuid, pays, utilisateur_id: utilisateurId } });
    if (!paiement) throw new NotFoundException('Paiement introuvable');
    return paiement;
  }

  async mesPaiements(pays: string, utilisateurId: number, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const [data, total] = await this.paiements.findAndCount({
      where: { pays, utilisateur_id: utilisateurId },
      order: { date_creation: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminList(pays: string, filtre: FilterPaiementsDto) {
    const page = filtre.page ?? 1;
    const limit = filtre.limit ?? 20;
    const qb = this.paiements.createQueryBuilder('p').where('p.pays = :pays', { pays });
    if (filtre.statut) qb.andWhere('p.statut = :statut', { statut: filtre.statut });
    if (filtre.prestataire) qb.andWhere('p.prestataire = :prestataire', { prestataire: filtre.prestataire });
    if (filtre.search) qb.andWhere('(p.reference ILIKE :q OR p.reference_prestataire ILIKE :q)', { q: `%${filtre.search}%` });
    const [data, total] = await qb.orderBy('p.date_creation', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async recevoirWebhook(prestataire: PrestatairePaiement, rawBody: Buffer, headers: Record<string, any>, payload: unknown) {
    const provider = this.providers.get(prestataire);
    const signatureValide = provider.verifierSignature(rawBody, headers);
    let evenementId = `${prestataire}-${Date.now()}`;
    try {
      evenementId = provider.parserWebhook(payload).evenementId;
    } catch {}

    let webhook: PaiementWebhook;
    try {
      webhook = await this.webhooks.save(this.webhooks.create({
        prestataire,
        evenement_id: evenementId,
        signature_valide: signatureValide,
        payload: payload as any,
      }));
    } catch (err) {
      if (String(err?.code) === '23505') return { received: true, duplicate: true };
      throw err;
    }

    if (!signatureValide) {
      await this.webhooks.update(webhook.id, { erreur_traitement: 'SIGNATURE_INVALIDE' });
      throw new UnauthorizedException('Signature webhook invalide');
    }

    try {
      await this.traiterWebhook(webhook.id, prestataire, payload);
      return { received: true };
    } catch (err) {
      await this.webhooks.update(webhook.id, { erreur_traitement: err?.message ?? String(err) });
      throw err;
    }
  }

  async traiterWebhook(webhookId: number, prestataire: PrestatairePaiement, payload: unknown) {
    const provider = this.providers.get(prestataire);
    const evt = provider.parserWebhook(payload);
    const paiement = await this.paiements.findOne({
      where: evt.referencePrestataire
        ? { prestataire, reference_prestataire: evt.referencePrestataire }
        : { prestataire, reference: evt.reference },
    });
    if (!paiement) throw new NotFoundException('Paiement introuvable');
    if (STATUTS_FINAUX.has(paiement.statut) && paiement.statut !== StatutPaiement.REUSSI) return;
    if (paiement.statut === StatutPaiement.REUSSI) return;

    const statutVerifie = paiement.reference_prestataire
      ? await provider.verifierStatut(paiement.reference_prestataire)
      : { statut: evt.statut, montant: evt.montant, devise: evt.devise };
    if (Number(statutVerifie.montant) !== Number(paiement.montant)) {
      throw new BadRequestException('Montant vérifié différent du montant attendu');
    }

    paiement.payload_confirmation = payload as any;
    paiement.statut = statutVerifie.statut;
    paiement.methode = evt.methode ?? paiement.methode;
    if (statutVerifie.statut === StatutPaiement.REUSSI) {
      paiement.date_confirmation = new Date();
    }
    await this.paiements.save(paiement);

    if (paiement.statut === StatutPaiement.REUSSI && paiement.abonnement_id) {
      const abonnement = await this.abonnements.findOne({ where: { id: paiement.abonnement_id } });
      if (abonnement) {
        await this.abonnementsService.activerApresPaiement(abonnement.uuid, {
          montant: paiement.montant,
          reference: paiement.reference,
          paiementId: paiement.id,
          prestataire,
        });
      }
    }

    await this.webhooks.update(webhookId, { traite: true });
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilierPaiements(): Promise<number> {
    const paiements = await this.paiements.find({
      where: { statut: StatutPaiement.EN_ATTENTE },
      order: { date_creation: 'ASC' },
      take: 100,
    });
    let traites = 0;
    for (const paiement of paiements) {
      try {
        if (paiement.date_expiration && paiement.date_expiration < new Date()) {
          paiement.statut = StatutPaiement.EXPIRE;
          await this.paiements.save(paiement);
          traites++;
          continue;
        }
        if (!paiement.reference_prestataire) continue;
        const provider = this.providers.get(paiement.prestataire);
        const statut = await provider.verifierStatut(paiement.reference_prestataire);
        if (statut.statut === StatutPaiement.REUSSI) {
          paiement.statut = StatutPaiement.REUSSI;
          paiement.date_confirmation = new Date();
          await this.paiements.save(paiement);
          const abonnement = await this.abonnements.findOne({ where: { id: paiement.abonnement_id ?? 0 } });
          if (abonnement) {
            await this.abonnementsService.activerApresPaiement(abonnement.uuid, {
              montant: paiement.montant,
              reference: paiement.reference,
              paiementId: paiement.id,
              prestataire: paiement.prestataire,
            });
          }
          traites++;
        }
      } catch (err) {
        this.logger.warn(`Réconciliation du paiement ${paiement.uuid} échouée: ${err?.message ?? err}`);
      }
    }
    return traites;
  }

  private async configurationActive(pays: string, prestataire?: PrestatairePaiement): Promise<ConfigurationPaiement> {
    const where = prestataire ? { pays, prestataire, est_actif: true } : { pays, est_actif: true };
    const config = await this.configurations.findOne({ where });
    if (!config) throw new NotFoundException('Configuration de paiement introuvable');
    return config;
  }

  private verifierPlafonds(config: ConfigurationPaiement, montant: number) {
    if (config.montant_min != null && montant < config.montant_min) throw new BadRequestException('Montant inférieur au minimum autorisé');
    if (config.montant_max != null && montant > config.montant_max) throw new BadRequestException('Montant supérieur au maximum autorisé');
  }
}
