import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../../config/data-source-resolver.service';
import { MailService } from '../../mail/mail.service';
import { EpreuveSubmission } from './entities/epreuve-submission.entity';
import { Epreuve, EpreuveSection } from '../entities/epreuve.entity';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';
import { Filiere } from '../../filieres/entities/filiere.entity';
import { NiveauEtude } from '../../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../../matieres/entities/matiere.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';
import { PaginationResponse } from '../../common/interfaces/pagination-response.interface';
import { CreerSubmissionDto } from './dto/creer-submission.dto';
import { ResoudreSubmissionDto } from './dto/resoudre-submission.dto';

@Injectable()
export class EpreuveSubmissionsService {
  private readonly logger = new Logger(EpreuveSubmissionsService.name);

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly mailService: MailService,
  ) { }

  private get submissionsRepository(): Repository<EpreuveSubmission> {
    return this.resolver.getRepository(EpreuveSubmission);
  }
  private get epreuvesRepository(): Repository<Epreuve> {
    return this.resolver.getRepository(Epreuve);
  }
  private get etablissementsRepository(): Repository<Etablissement> {
    return this.resolver.getRepository(Etablissement);
  }
  private get filieresRepository(): Repository<Filiere> {
    return this.resolver.getRepository(Filiere);
  }
  private get niveauxRepository(): Repository<NiveauEtude> {
    return this.resolver.getRepository(NiveauEtude);
  }
  private get matieresRepository(): Repository<Matiere> {
    return this.resolver.getRepository(Matiere);
  }

  // STEP 1 — submit metadata. Each parent level is either an existing id (validated
  // here) or a proposed name (captured for the admin to resolve at approval). The
  // duplicate check runs ONLY when all four parents resolve to existing ids.
  async createSubmission(pays: string, dto: CreerSubmissionDto, soumisParId: number) {
    this.logger.log(`Soumission d'épreuve: "${dto.titre}" par utilisateur ${soumisParId}`);

    // Validate each provided id and capture its pays — the DEEPEST resolved parent
    // wins (matiere > niveau > filiere > etablissement); none resolved → request country.
    let derivedPays: string | undefined;

    if (dto.etablissement_id != null) {
      const e = await this.etablissementsRepository.findOne({ where: { id: dto.etablissement_id } });
      if (!e) throw new NotFoundException(`Établissement #${dto.etablissement_id} introuvable`);
      derivedPays = e.pays;
    }
    if (dto.filiere_id != null) {
      const f = await this.filieresRepository.findOne({ where: { id: dto.filiere_id } });
      if (!f) throw new NotFoundException(`Filière #${dto.filiere_id} introuvable`);
      derivedPays = f.pays;
    }
    if (dto.niveau_etude_id != null) {
      const n = await this.niveauxRepository.findOne({ where: { id: dto.niveau_etude_id } });
      if (!n) throw new NotFoundException(`Niveau d'étude #${dto.niveau_etude_id} introuvable`);
      derivedPays = n.pays;
    }
    if (dto.matiere_id != null) {
      const m = await this.matieresRepository.findOne({ where: { id: dto.matiere_id } });
      if (!m) throw new NotFoundException(`Matière #${dto.matiere_id} introuvable`);
      derivedPays = m.pays;
    }

    const submissionPays = derivedPays ?? pays ?? 'benin';
    const section = dto.section ?? EpreuveSection.NORMAL;

    // Duplicate check ONLY when all four parents are existing ids. matiere_id
    // pins the whole chain, so matiere_id + titre + annee + section identifies it.
    const allFourResolved =
      dto.etablissement_id != null && dto.filiere_id != null &&
      dto.niveau_etude_id != null && dto.matiere_id != null;

    if (allFourResolved) {
      const dupQb = this.epreuvesRepository.createQueryBuilder('epreuve')
        .where('epreuve.matiere_id = :matiere_id', { matiere_id: dto.matiere_id })
        .andWhere('epreuve.titre = :titre', { titre: dto.titre })
        .andWhere('epreuve.section = :section', { section });
      if (dto.annee === null || dto.annee === undefined) {
        dupQb.andWhere('epreuve.annee IS NULL');
      } else {
        dupQb.andWhere('epreuve.annee = :annee', { annee: dto.annee });
      }
      const duplicate = await dupQb.getOne();
      if (duplicate) {
        this.logger.warn(`Doublon refusé: l'épreuve #${duplicate.id} a déjà ce tuple complet`);
        throw new ConflictException(
          "Une épreuve avec ce même établissement, filière, niveau, matière, titre, année et session existe déjà.",
        );
      }
    }

    const submission = new EpreuveSubmission();
    submission.etablissement_id = dto.etablissement_id ?? null;
    submission.proposed_etablissement = dto.proposed_etablissement ?? null;
    submission.filiere_id = dto.filiere_id ?? null;
    submission.proposed_filiere = dto.proposed_filiere ?? null;
    submission.niveau_etude_id = dto.niveau_etude_id ?? null;
    submission.proposed_niveau = dto.proposed_niveau ?? null;
    submission.matiere_id = dto.matiere_id ?? null;
    submission.proposed_matiere = dto.proposed_matiere ?? null;
    submission.titre = dto.titre;
    submission.annee = dto.annee ?? null;
    submission.section = section;
    submission.pays = submissionPays;
    submission.soumis_par_id = soumisParId;
    submission.status = ServiceStatusEnum.PENDING_APPROVAL;

    const saved = await this.submissionsRepository.save(submission);
    this.logger.log(`Soumission créée: #${saved.id} (uuid ${saved.uuid}, pays ${saved.pays})`);
    return saved;
  }

  // Client-facing submission shape. A deeper id IMPLIES its ancestors via the
  // chain (matiere → niveau_etude → filiere → etablissement), so we derive and
  // return the ancestor objects from the deepest set id; a level is `missing`
  // only when neither it nor any deeper level resolves it (i.e. genuinely a
  // proposed-new level). Requires the deep relations to be loaded.
  private toSubmissionResponse(s: EpreuveSubmission) {
    const ref = (x?: { id: number; nom: string } | null) => x ? { id: x.id, nom: x.nom } : null;

    const effMatiere = s.matiere ?? null;
    const effNiveau = s.niveau_etude ?? effMatiere?.niveau_etude ?? null;
    const effFiliere = s.filiere ?? effNiveau?.filiere ?? null;
    const effEtab = s.etablissement ?? effFiliere?.etablissement ?? null;

    return {
      id: s.id,
      uuid: s.uuid,
      pays: s.pays,
      titre: s.titre,
      annee: s.annee,
      section: s.section,
      status: s.status,
      date_creation: s.date_creation,
      file_path: s.file_path,
      file_extension: s.file_extension,
      url: s.url,
      soumis_par: s.soumis_par
        ? { id: s.soumis_par.id, nom: s.soumis_par.nom, prenom: s.soumis_par.prenom, email: s.soumis_par.email }
        : null,
      etablissement: ref(effEtab),
      proposed_etablissement: s.proposed_etablissement,
      filiere: ref(effFiliere),
      proposed_filiere: s.proposed_filiere,
      niveau_etude: ref(effNiveau),
      proposed_niveau: s.proposed_niveau,
      matiere: ref(effMatiere),
      proposed_matiere: s.proposed_matiere,
      missing: {
        etablissement: effEtab == null,
        filiere: effFiliere == null,
        niveau_etude: effNiveau == null,
        matiere: effMatiere == null,
      },
    };
  }

  // Admin queue: list submissions (optional status filter), with parents resolved
  // and missing ones flagged.
  async findAllForAdmin(
    pays: string,
    opts: { status?: ServiceStatusEnum; page?: number; limit?: number },
  ): Promise<PaginationResponse<ReturnType<EpreuveSubmissionsService['toSubmissionResponse']>>> {
    const { status, page = 1, limit = 10 } = opts;
    const qb = this.submissionsRepository.createQueryBuilder('submission')
      .leftJoinAndSelect('submission.etablissement', 'etablissement')
      .leftJoinAndSelect('submission.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'f_etab')
      .leftJoinAndSelect('submission.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'n_filiere')
      .leftJoinAndSelect('n_filiere.etablissement', 'n_etab')
      .leftJoinAndSelect('submission.matiere', 'matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'm_niveau')
      .leftJoinAndSelect('m_niveau.filiere', 'm_filiere')
      .leftJoinAndSelect('m_filiere.etablissement', 'm_etab')
      .leftJoinAndSelect('submission.soumis_par', 'soumis_par')
      .where('submission.pays = :pays', { pays })
      .orderBy('submission.date_creation', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('submission.status = :status', { status });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map(r => this.toSubmissionResponse(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async loadSubmissionOrThrow(id: number): Promise<EpreuveSubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id },
      relations: [
        'soumis_par',
        'etablissement',
        'filiere', 'filiere.etablissement',
        'niveau_etude', 'niveau_etude.filiere', 'niveau_etude.filiere.etablissement',
        'matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'matiere.niveau_etude.filiere.etablissement',
      ],
    });
    if (!submission) {
      throw new NotFoundException(`Soumission #${id} introuvable`);
    }
    return submission;
  }

  private uploaderName(s: EpreuveSubmission): string {
    const u = s.soumis_par;
    if (!u) return 'Utilisateur';
    return u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.prenom || u.nom || 'Utilisateur');
  }

  // Admin resolution: attach validated real parent ids (clearing the matching
  // proposed_* name), then re-derive pays from the deepest resolved parent.
  async resolveParents(id: number, dto: ResoudreSubmissionDto) {
    const submission = await this.loadSubmissionOrThrow(id);

    if (dto.etablissement_id != null) {
      const e = await this.etablissementsRepository.findOne({ where: { id: dto.etablissement_id } });
      if (!e) throw new NotFoundException(`Établissement #${dto.etablissement_id} introuvable`);
      submission.etablissement_id = dto.etablissement_id;
      submission.proposed_etablissement = null;
      submission.pays = e.pays;
    }
    if (dto.filiere_id != null) {
      const f = await this.filieresRepository.findOne({ where: { id: dto.filiere_id } });
      if (!f) throw new NotFoundException(`Filière #${dto.filiere_id} introuvable`);
      submission.filiere_id = dto.filiere_id;
      submission.proposed_filiere = null;
      submission.pays = f.pays;
    }
    if (dto.niveau_etude_id != null) {
      const n = await this.niveauxRepository.findOne({ where: { id: dto.niveau_etude_id } });
      if (!n) throw new NotFoundException(`Niveau d'étude #${dto.niveau_etude_id} introuvable`);
      submission.niveau_etude_id = dto.niveau_etude_id;
      submission.proposed_niveau = null;
      submission.pays = n.pays;
    }
    if (dto.matiere_id != null) {
      const m = await this.matieresRepository.findOne({ where: { id: dto.matiere_id } });
      if (!m) throw new NotFoundException(`Matière #${dto.matiere_id} introuvable`);
      submission.matiere_id = dto.matiere_id;
      submission.proposed_matiere = null;
      submission.pays = m.pays;
    }

    await this.submissionsRepository.save(submission);
    const reloaded = await this.loadSubmissionOrThrow(id);
    this.logger.log(`Soumission #${id} résolue (parents mis à jour)`);
    return this.toSubmissionResponse(reloaded);
  }

  // Admin approve: requires all four parents resolved to real ids, then creates the
  // real épreuve (file/url copied from the submission, professeur = uploader),
  // marks the submission approved, and emails the uploader.
  async approve(id: number) {
    const submission = await this.loadSubmissionOrThrow(id);

    // Idempotency guard: re-approving must not create a second épreuve.
    if (submission.status === ServiceStatusEnum.APPROVED) {
      throw new ConflictException(`Soumission #${id} déjà approuvée.`);
    }

    // matiere_id alone pins the whole chain and is the only parent the real
    // épreuve stores, so it's the sole gate. Proposed-new ancestors must have
    // been turned into a real matière (via resolution) before approval.
    if (submission.matiere_id == null) {
      throw new BadRequestException(
        "La matière doit être résolue avant approbation (elle détermine toute la chaîne).",
      );
    }

    const matiere = await this.matieresRepository.findOne({ where: { id: submission.matiere_id } });
    if (!matiere) {
      throw new NotFoundException(`Matière #${submission.matiere_id} introuvable`);
    }

    // soumis_par_id is ON DELETE SET NULL but epreuves.professeur_id is NOT NULL.
    if (submission.soumis_par_id == null) {
      throw new BadRequestException("L'auteur de la soumission n'existe plus; impossible de créer l'épreuve.");
    }

    const epreuve = new Epreuve();
    epreuve.titre = submission.titre;
    epreuve.matiere_id = submission.matiere_id;
    epreuve.professeur_id = submission.soumis_par_id;
    epreuve.annee = submission.annee ?? undefined;
    epreuve.section = (submission.section as EpreuveSection) ?? EpreuveSection.NORMAL;
    epreuve.duree_minutes = 0;
    // File stays at the submission's R2 key + Firebase URL; the épreuve row
    // references them (column-value copy — no byte copy in FilesModule).
    epreuve.file_path = submission.file_path;
    epreuve.file_extension = submission.file_extension;
    epreuve.url = submission.url;
    epreuve.pays = matiere.pays;
    const savedEpreuve = await this.epreuvesRepository.save(epreuve);

    submission.status = ServiceStatusEnum.APPROVED;
    await this.submissionsRepository.save(submission);

    if (submission.soumis_par?.email) {
      this.mailService.sendServiceStatusUpdateEmail(
        submission.soumis_par.email, this.uploaderName(submission), submission.titre, 'approved', 'épreuve',
      ).catch(err => this.logger.error(`Failed to send approval email for submission ${id}: ${err.message}`));
    }

    this.logger.log(`Soumission #${id} approuvée → épreuve #${savedEpreuve.id} créée`);
    return { submission: this.toSubmissionResponse(submission), epreuve: savedEpreuve };
  }

  // Admin decline: mark declined + email the uploader. Reason is logged only.
  async decline(id: number, reason?: string) {
    const submission = await this.loadSubmissionOrThrow(id);

    submission.status = ServiceStatusEnum.DECLINED;
    await this.submissionsRepository.save(submission);
    if (reason) {
      this.logger.log(`Soumission #${id} refusée. Motif: ${reason}`);
    }

    if (submission.soumis_par?.email) {
      this.mailService.sendServiceStatusUpdateEmail(
        submission.soumis_par.email, this.uploaderName(submission), submission.titre, 'declined', 'épreuve',
      ).catch(err => this.logger.error(`Failed to send decline email for submission ${id}: ${err.message}`));
    }

    this.logger.log(`Soumission #${id} refusée`);
    return this.toSubmissionResponse(submission);
  }
}
