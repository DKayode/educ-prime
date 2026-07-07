import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { FormCampaign } from './entities/form-campaign.entity';
import { FormSection } from './entities/form-section.entity';
import { FormQuestion } from './entities/form-question.entity';
import { FormResponse } from './entities/form-response.entity';
import { FormAnswer } from './entities/form-answer.entity';
import { CreerCampaignDto, CreerSectionDto } from './dto/creer-campaign.dto';
import { MajStatutDto } from './dto/maj-statut.dto';
import { MajCampaignDto } from './dto/maj-campaign.dto';
import { FilterCampaignDto } from './dto/filter-campaign.dto';
import { SoumettreReponseDto } from './dto/soumettre-reponse.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @InjectRepository(FormCampaign)
    private readonly campaignRepository: Repository<FormCampaign>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Serialization (ids exposed as `uuid`; no internal FK id columns leak) ──

  private serializeCampaign(c: FormCampaign) {
    return {
      uuid: c.id,
      titre: c.titre,
      description: c.description,
      statut: c.statut,
      trigger_type: c.trigger_type,
      date_debut: c.date_debut,
      date_fin: c.date_fin,
      pays: c.pays,
      created_by: c.created_by,
      date_creation: c.date_creation,
    };
  }

  private serializeTree(c: FormCampaign) {
    const sections = [...(c.sections ?? [])].sort((a, b) => a.ordre - b.ordre);
    return {
      ...this.serializeCampaign(c),
      sections: sections.map((s) => ({
        uuid: s.id,
        titre: s.titre,
        icone: s.icone,
        ordre: s.ordre,
        questions: [...(s.questions ?? [])]
          .sort((a, b) => a.ordre - b.ordre)
          .map((q) => ({
            uuid: q.id,
            libelle: q.libelle,
            type: q.type,
            ordre: q.ordre,
          })),
      })),
    };
  }

  // ── Admin CRUD ──

  async create(pays: string, dto: CreerCampaignDto, createdBy: number | null) {
    const campaignId = await this.dataSource.transaction(async (manager) => {
      const campaign = await manager.save(
        manager.create(FormCampaign, {
          titre: dto.titre,
          description: dto.description ?? null,
          trigger_type: dto.trigger_type ?? 'app_open',
          statut: 'draft',
          pays,
          created_by: createdBy,
        }),
      );
      await this.saveTree(manager, campaign.id, dto.sections);
      return campaign.id;
    });

    this.logger.log(`Campagne créée: ${dto.titre} (${campaignId}, pays: ${pays})`);
    return this.findOne(pays, campaignId);
  }

  async update(pays: string, uuid: string, dto: CreerCampaignDto) {
    await this.dataSource.transaction(async (manager) => {
      const campaign = await manager.findOne(FormCampaign, {
        where: { id: uuid, pays },
      });
      if (!campaign) {
        throw new NotFoundException('Campagne non trouvée');
      }
      // Structural edits are frozen once responses exist — replacing the tree
      // would cascade-delete collected answers. Title/description stay editable
      // via updateMeta; statut via updateStatut.
      const [{ count }] = await manager.query(
        `SELECT COUNT(*)::int AS count FROM form_responses WHERE campaign_id = $1`,
        [uuid],
      );
      if (count > 0) {
        throw new ConflictException(
          'Impossible de modifier la structure: des réponses existent déjà',
        );
      }
      campaign.titre = dto.titre;
      campaign.description = dto.description ?? null;
      if (dto.trigger_type) campaign.trigger_type = dto.trigger_type;
      await manager.save(campaign);

      // Replace the whole tree — the builder always sends the full structure.
      // Deleting sections cascades to questions (and their answers) via the DB.
      await manager.delete(FormSection, { campaign_id: uuid });
      await this.saveTree(manager, uuid, dto.sections);
    });

    return this.findOne(pays, uuid);
  }

  private async saveTree(
    manager: EntityManager,
    campaignId: string,
    sections: CreerSectionDto[],
  ) {
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const section = await manager.save(
        manager.create(FormSection, {
          campaign_id: campaignId,
          titre: sec.titre,
          icone: sec.icone ?? null,
          ordre: sec.ordre ?? i,
        }),
      );
      const questions = (sec.questions ?? []).map((q, j) =>
        manager.create(FormQuestion, {
          section_id: section.id,
          libelle: q.libelle,
          type: q.type,
          ordre: q.ordre ?? j,
        }),
      );
      if (questions.length) await manager.save(questions);
    }
  }

  async findAll(pays: string, filterDto: FilterCampaignDto) {
    const { page = 1, limit = 10, statut, search } = filterDto;

    const qb = this.campaignRepository
      .createQueryBuilder('c')
      .where('c.pays = :pays', { pays })
      .orderBy('c.date_creation', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (statut) qb.andWhere('c.statut = :statut', { statut });
    if (search) {
      qb.andWhere('unaccent(c.titre) ILIKE unaccent(:search)', {
        search: `%${search}%`,
      });
    }

    const [campaigns, total] = await qb.getManyAndCount();

    // Response counts for the listed page in one grouped query.
    const counts = new Map<string, number>();
    if (campaigns.length) {
      const rows = await this.dataSource.query(
        `SELECT campaign_id, COUNT(*)::int AS n
           FROM form_responses
          WHERE campaign_id = ANY($1)
          GROUP BY campaign_id`,
        [campaigns.map((c) => c.id)],
      );
      for (const r of rows) counts.set(r.campaign_id, r.n);
    }

    const data = campaigns.map((c) => ({
      ...this.serializeCampaign(c),
      nb_reponses: counts.get(c.id) ?? 0,
    }));

    const result: PaginationResponse<any> = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    return result;
  }

  async findOne(pays: string, uuid: string) {
    const campaign = await this.loadTree(this.dataSource.manager, pays, uuid);
    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }
    return this.serializeTree(campaign);
  }

  private loadTree(manager: EntityManager, pays: string, uuid: string) {
    return manager.findOne(FormCampaign, {
      where: { id: uuid, pays },
      relations: ['sections', 'sections.questions'],
    });
  }

  async updateStatut(pays: string, uuid: string, dto: MajStatutDto) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: uuid, pays },
    });
    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }
    campaign.statut = dto.statut;
    if (dto.statut === 'active' && !campaign.date_debut) {
      campaign.date_debut = new Date();
    }
    if (dto.statut === 'archived' && !campaign.date_fin) {
      campaign.date_fin = new Date();
    }
    await this.campaignRepository.save(campaign);
    return this.serializeCampaign(campaign);
  }

  // Metadata-only edit (titre/description) — always allowed, never touches the
  // section/question tree, so it stays available after responses exist.
  async updateMeta(pays: string, uuid: string, dto: MajCampaignDto) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: uuid, pays },
    });
    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }
    if (dto.titre !== undefined) campaign.titre = dto.titre;
    if (dto.description !== undefined) campaign.description = dto.description ?? null;
    await this.campaignRepository.save(campaign);
    return this.serializeCampaign(campaign);
  }

  async remove(pays: string, uuid: string) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: uuid, pays },
    });
    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }
    // Sections/questions/responses/answers are removed by the DB (FK CASCADE).
    await this.campaignRepository.remove(campaign);
    return { message: 'Campagne supprimée avec succès' };
  }

  // ── Results / KPI aggregation (raw SQL, pays-scoped) ──

  async getResults(pays: string, uuid: string) {
    // Ensures the campaign exists in this pays (404 otherwise) + gives the tree.
    const campaign = await this.loadTree(this.dataSource.manager, pays, uuid);
    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }

    const [{ total }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM form_responses WHERE campaign_id = $1`,
      [uuid],
    );

    const ratingRows = await this.dataSource.query(
      `SELECT q.id AS question_id,
              q.libelle,
              q.ordre,
              q.section_id,
              COUNT(a.rating) FILTER (WHERE a.rating = 1)::int AS c1,
              COUNT(a.rating) FILTER (WHERE a.rating = 2)::int AS c2,
              COUNT(a.rating) FILTER (WHERE a.rating = 3)::int AS c3,
              COUNT(a.rating) FILTER (WHERE a.rating = 4)::int AS c4,
              COUNT(a.rating)::int AS total_reponses,
              AVG(a.rating)::float AS moyenne
         FROM form_questions q
         JOIN form_sections s ON s.id = q.section_id
         LEFT JOIN form_answers a
                ON a.question_id = q.id AND a.rating IS NOT NULL
        WHERE s.campaign_id = $1 AND q.type = 'rating'
        GROUP BY q.id, q.libelle, q.ordre, q.section_id
        ORDER BY q.ordre`,
      [uuid],
    );

    const textRows = await this.dataSource.query(
      `SELECT q.id AS question_id,
              a.texte,
              r.submitted_at
         FROM form_questions q
         JOIN form_sections s ON s.id = q.section_id
         JOIN form_answers a ON a.question_id = q.id
         JOIN form_responses r ON r.id = a.response_id
        WHERE s.campaign_id = $1 AND q.type = 'text'
          AND a.texte IS NOT NULL AND a.texte <> ''
        ORDER BY q.ordre, r.submitted_at DESC`,
      [uuid],
    );

    const overTime = await this.dataSource.query(
      `SELECT to_char(date_trunc('day', submitted_at), 'YYYY-MM-DD') AS jour,
              COUNT(*)::int AS n
         FROM form_responses
        WHERE campaign_id = $1
        GROUP BY 1
        ORDER BY 1`,
      [uuid],
    );

    // Section titles for grouping context in the response.
    const sectionTitre = new Map(
      (campaign.sections ?? []).map((s) => [s.id, s.titre]),
    );

    const rating_questions = ratingRows.map((r: any) => ({
      uuid: r.question_id,
      libelle: r.libelle,
      section_titre: sectionTitre.get(r.section_id) ?? null,
      distribution: { 1: r.c1, 2: r.c2, 3: r.c3, 4: r.c4 },
      total_reponses: r.total_reponses,
      moyenne: r.moyenne === null ? null : Number(r.moyenne.toFixed(2)),
    }));

    // All text questions (even those with zero answers) with their answer list.
    const textAnswers = new Map<string, { texte: string; submitted_at: Date }[]>();
    for (const row of textRows) {
      const list = textAnswers.get(row.question_id) ?? [];
      list.push({ texte: row.texte, submitted_at: row.submitted_at });
      textAnswers.set(row.question_id, list);
    }
    const text_questions: any[] = [];
    for (const s of campaign.sections ?? []) {
      for (const q of s.questions ?? []) {
        if (q.type === 'text') {
          text_questions.push({
            uuid: q.id,
            libelle: q.libelle,
            section_titre: s.titre,
            reponses: textAnswers.get(q.id) ?? [],
          });
        }
      }
    }

    return {
      campaign: this.serializeCampaign(campaign),
      total_reponses: total,
      rating_questions,
      text_questions,
      reponses_par_jour: overTime.map((r: any) => ({ jour: r.jour, count: r.n })),
    };
  }

  // ── User-facing ──

  async getActive(pays: string, userId: number) {
    const active = await this.campaignRepository
      .createQueryBuilder('c')
      .where('c.pays = :pays', { pays })
      .andWhere('c.statut = :statut', { statut: 'active' })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM form_responses r WHERE r.campaign_id = c.id AND r.user_id = :userId)`,
        { userId },
      )
      .orderBy('c.date_creation', 'DESC')
      .getOne();

    if (!active) return null;

    const campaign = await this.loadTree(this.dataSource.manager, pays, active.id);
    return campaign ? this.serializeTree(campaign) : null;
  }

  async submitResponse(
    pays: string,
    uuid: string,
    userId: number,
    dto: SoumettreReponseDto,
  ) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: uuid, pays },
    });
    if (!campaign) {
      throw new NotFoundException('Campagne non trouvée');
    }
    if (campaign.statut !== 'active') {
      throw new BadRequestException("Cette campagne n'est pas active");
    }

    // Answers must target questions that belong to THIS campaign.
    const validRows = await this.dataSource.query(
      `SELECT q.id
         FROM form_questions q
         JOIN form_sections s ON s.id = q.section_id
        WHERE s.campaign_id = $1`,
      [uuid],
    );
    const validIds = new Set(validRows.map((r: any) => r.id));
    for (const a of dto.answers) {
      if (!validIds.has(a.question_id)) {
        throw new BadRequestException(
          `Question ${a.question_id} n'appartient pas à cette campagne`,
        );
      }
    }

    try {
      const response = await this.dataSource.transaction(async (manager) => {
        const saved = await manager.save(
          manager.create(FormResponse, {
            campaign_id: uuid,
            user_id: userId,
            pays,
          }),
        );
        const answers = dto.answers.map((a) =>
          manager.create(FormAnswer, {
            response_id: saved.id,
            question_id: a.question_id,
            rating: a.rating ?? null,
            texte: a.texte ?? null,
          }),
        );
        if (answers.length) await manager.save(answers);
        return saved;
      });

      return { uuid: response.id, submitted_at: response.submitted_at };
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Vous avez déjà répondu à cette campagne');
      }
      throw e;
    }
  }
}
