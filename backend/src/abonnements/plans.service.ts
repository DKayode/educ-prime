import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanAbonnement } from './entities/plan-abonnement.entity';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(PlanAbonnement) private readonly plans: Repository<PlanAbonnement>,
  ) {}

  /** Catalogue visible du mobile : uniquement les plans ouverts. */
  async findActifs(pays: string): Promise<PlanAbonnement[]> {
    return this.plans.find({
      where: { pays, est_actif: true },
      order: { ordre_affichage: 'ASC', prix: 'ASC' },
    });
  }

  /** Vue admin : tout, y compris les plans fermés. */
  async findAll(pays: string): Promise<PlanAbonnement[]> {
    return this.plans.find({ where: { pays }, order: { ordre_affichage: 'ASC', prix: 'ASC' } });
  }

  async findByUuid(uuid: string): Promise<PlanAbonnement> {
    const plan = await this.plans.findOne({ where: { uuid } });
    if (!plan) throw new NotFoundException('Plan introuvable');
    return plan;
  }

  async create(pays: string, dto: CreatePlanDto): Promise<PlanAbonnement> {
    const code = dto.code.toUpperCase();
    if (await this.plans.findOne({ where: { pays, code } })) {
      throw new ConflictException(`Un plan ${code} existe déjà pour ${pays}`);
    }
    const plan = this.plans.create({ ...dto, code, pays });
    const saved = await this.plans.save(plan);
    this.logger.log(`Plan créé: ${saved.code} (${pays}) — ${saved.prix} ${saved.devise}`);
    return saved;
  }

  async update(uuid: string, dto: UpdatePlanDto): Promise<PlanAbonnement> {
    const plan = await this.findByUuid(uuid);
    if (dto.code && dto.code.toUpperCase() !== plan.code) {
      const code = dto.code.toUpperCase();
      if (await this.plans.findOne({ where: { pays: plan.pays, code } })) {
        throw new ConflictException(`Un plan ${code} existe déjà pour ${plan.pays}`);
      }
    }
    Object.assign(plan, dto, dto.code ? { code: dto.code.toUpperCase() } : {});
    return this.plans.save(plan);
  }

  /**
   * Suppression logique. Un plan référencé par un abonnement ne peut pas
   * disparaître (FK ON DELETE RESTRICT) : on le ferme, on garde l'historique.
   */
  async desactiver(uuid: string): Promise<PlanAbonnement> {
    const plan = await this.findByUuid(uuid);
    plan.est_actif = false;
    return this.plans.save(plan);
  }
}
