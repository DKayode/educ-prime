import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { ConcoursSubmission } from './entities/concours-submission.entity';
import { Concours } from './entities/concours.entity';
import { Structure } from '../structure/entities/structure.entity';
import { Titre } from '../titre/entities/titre.entity';
import { ServiceStatusEnum } from '../common/enums/service-status.enum';
import { CreateConcoursSubmissionDto } from './dto/create-concours-submission.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { MailService } from '../mail/mail.service';
import { FilesService } from '../files/files.service';
import { CreditWalletFromValidatedExamUseCase } from '../wallet/wallet-balance/use-cases/credit-wallet-from-validated-exam.use-case';

@Injectable()
export class ConcoursSubmissionsService {
    private readonly logger = new Logger(ConcoursSubmissionsService.name);

    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly mailService: MailService,
        private readonly filesService: FilesService,
        private readonly creditWalletFromExam: CreditWalletFromValidatedExamUseCase,
    ) { }

    private get submissionRepository(): Repository<ConcoursSubmission> {
        return this.resolver.getRepository(ConcoursSubmission);
    }
    private get concoursRepository(): Repository<Concours> {
        return this.resolver.getRepository(Concours);
    }
    private get structureRepository(): Repository<Structure> {
        return this.resolver.getRepository(Structure);
    }
    private get titreRepository(): Repository<Titre> {
        return this.resolver.getRepository(Titre);
    }

    // Decorate a submission with which parent(s) still need admin resolution,
    // and project the uploader down to safe public fields (never leak the
    // password hash / fcm_token / digit_code from the joined utilisateur row).
    private withMissingFlags(s: ConcoursSubmission) {
        const u = s.soumis_par;
        const soumis_par = u
            ? { id: u.id, uuid: u.uuid, nom: u.nom, prenom: u.prenom, email: u.email }
            : null;
        return {
            ...s,
            soumis_par,
            missing_structure: s.structure_id == null,
            missing_titre: s.titre_id == null,
        };
    }

    // STEP 1 — any authenticated user submits concours metadata. For each parent
    // they supply an existing id (validated) OR a proposed name. A duplicate
    // (409) is only raised when BOTH structure and titre are existing ids and an
    // identical (structure, titre, annee) concours already exists in the pays.
    async createSubmission(pays: string, userId: number, dto: CreateConcoursSubmissionDto) {
        const proposedStructure = dto.proposed_structure?.trim() || null;
        const proposedTitre = dto.proposed_titre?.trim() || null;

        const hasStructure = dto.structure_id != null || !!proposedStructure;
        const hasTitre = dto.titre_id != null || !!proposedTitre;
        if (!hasStructure || !hasTitre) {
            throw new BadRequestException(
                'Vous devez fournir, pour la structure ET le titre, soit un identifiant existant soit un nom proposé.',
            );
        }

        // Validate provided existing ids.
        if (dto.structure_id != null) {
            const structure = await this.structureRepository.findOne({ where: { id: dto.structure_id } });
            if (!structure) throw new NotFoundException(`Structure avec l'ID ${dto.structure_id} non trouvée`);
        }
        if (dto.titre_id != null) {
            const titre = await this.titreRepository.findOne({ where: { id: dto.titre_id } });
            if (!titre) throw new NotFoundException(`Titre avec l'ID ${dto.titre_id} non trouvé`);
        }

        // Duplicate check ONLY when both parents resolve to existing ids.
        if (dto.structure_id != null && dto.titre_id != null) {
            const existing = await this.concoursRepository.findOne({
                where: {
                    pays,
                    structure_id: dto.structure_id,
                    titre_id: dto.titre_id,
                    annee: dto.annee == null ? IsNull() : dto.annee,
                },
            });
            if (existing) {
                this.logger.warn(`Doublon concours (structure ${dto.structure_id}, titre ${dto.titre_id}, annee ${dto.annee}, pays ${pays}) — soumission refusée`);
                throw new ConflictException(
                    `Un concours pour cette structure, ce titre et cette année (${dto.annee ?? 'non précisée'}) existe déjà.`,
                );
            }
        }

        // Reject a duplicate PENDING submission (same effective structure + titre
        // + année) so two users can't queue the same concours twice. Structure/
        // titre match by existing id when given, else by proposed name (case-
        // insensitive); année is null-aware.
        const dupQb = this.submissionRepository.createQueryBuilder('s')
            .where('s.pays = :pays', { pays })
            .andWhere('s.status = :st', { st: ServiceStatusEnum.PENDING_APPROVAL });
        if (dto.structure_id != null) {
            dupQb.andWhere('s.structure_id = :sid', { sid: dto.structure_id });
        } else {
            dupQb.andWhere('s.structure_id IS NULL AND LOWER(s.proposed_structure) = LOWER(:ps)', { ps: proposedStructure });
        }
        if (dto.titre_id != null) {
            dupQb.andWhere('s.titre_id = :tid', { tid: dto.titre_id });
        } else {
            dupQb.andWhere('s.titre_id IS NULL AND LOWER(s.proposed_titre) = LOWER(:pt)', { pt: proposedTitre });
        }
        if (dto.annee == null) {
            dupQb.andWhere('s.annee IS NULL');
        } else {
            dupQb.andWhere('s.annee = :an', { an: dto.annee });
        }
        const pendingDup = await dupQb.getOne();
        if (pendingDup) {
            this.logger.warn(`Soumission doublon (déjà en attente #${pendingDup.id}, pays ${pays}) — refusée`);
            throw new ConflictException(
                `Une soumission identique pour cette structure, ce titre et cette année (${dto.annee ?? 'non précisée'}) est déjà en attente d'approbation.`,
            );
        }

        const submission = this.submissionRepository.create({
            pays,
            structure_id: dto.structure_id ?? null,
            proposed_structure: dto.structure_id != null ? null : proposedStructure,
            titre_id: dto.titre_id ?? null,
            proposed_titre: dto.titre_id != null ? null : proposedTitre,
            annee: dto.annee ?? null,
            lieu: dto.lieu ?? null,
            soumis_par_id: userId,
            status: ServiceStatusEnum.PENDING_APPROVAL,
        });
        const saved = await this.submissionRepository.save(submission);
        this.logger.log(`Soumission concours créée (ID ${saved.id}, uuid ${saved.uuid}, soumis_par ${userId}, pays ${pays})`);
        return this.withMissingFlags(saved);
    }

    // Admin: list submissions (pays-scoped), optionally filtered by status
    // (defaults to pending_approval), with structure/titre resolved and the
    // missing/proposed parents flagged.
    async findAll(pays: string, status: string | undefined, paginationDto: PaginationDto): Promise<PaginationResponse<any>> {
        const { page = 1, limit = 10 } = paginationDto;
        const effectiveStatus = status || ServiceStatusEnum.PENDING_APPROVAL;
        this.logger.log(`Liste des soumissions (pays=${pays}, status=${effectiveStatus}, page=${page}, limit=${limit})`);

        const [rows, total] = await this.submissionRepository.createQueryBuilder('submission')
            .leftJoinAndSelect('submission.structure', 'structure')
            .leftJoinAndSelect('submission.titre_ref', 'titre_ref')
            .leftJoin('submission.soumis_par', 'soumis_par')
            .addSelect(['soumis_par.id', 'soumis_par.uuid', 'soumis_par.nom', 'soumis_par.prenom', 'soumis_par.email'])
            .where('submission.pays = :pays', { pays })
            .andWhere('submission.status = :status', { status: effectiveStatus })
            .orderBy('submission.date_creation', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data: rows.map(r => this.withMissingFlags(r)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Self-service: the caller's OWN concours submissions, pays-scoped, newest
    // first, paginated, optional status filter. Unlike the admin findAll, there
    // is NO forced pending_approval default — with no ?status the user sees ALL
    // their submissions (approved/declined/pending). structure/titre_ref are
    // joined so resolved names show; soumis_par is NOT joined (the caller owns
    // the rows), so withMissingFlags serializes soumis_par as null and no
    // uploader row — hence no password — is ever returned.
    async findMine(pays: string, soumisParId: number, status: string | undefined, paginationDto: PaginationDto): Promise<PaginationResponse<any>> {
        const { page = 1, limit = 10 } = paginationDto;
        this.logger.log(`Mes soumissions concours (pays=${pays}, soumis_par=${soumisParId}, status=${status ?? 'tous'}, page=${page}, limit=${limit})`);

        const qb = this.submissionRepository.createQueryBuilder('submission')
            .leftJoinAndSelect('submission.structure', 'structure')
            .leftJoinAndSelect('submission.titre_ref', 'titre_ref')
            .where('submission.pays = :pays', { pays })
            .andWhere('submission.soumis_par_id = :soumisParId', { soumisParId })
            .orderBy('submission.date_creation', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (status) {
            qb.andWhere('submission.status = :status', { status });
        }

        const [rows, total] = await qb.getManyAndCount();
        return {
            data: rows.map(r => this.withMissingFlags(r)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Admin: bind a resolved structure/titre id onto a PENDING submission and
    // clear the matching proposed name — PERSISTED, so the "à résoudre" prompt
    // disappears for everyone and the same missing entity can't be re-created.
    async resolveSubmission(pays: string, id: number, resolve: { structure_id?: number; titre_id?: number }) {
        const submission = await this.loadOrThrow(pays, id);
        if (submission.status !== ServiceStatusEnum.PENDING_APPROVAL) {
            throw new BadRequestException('Seule une soumission en attente peut être résolue.');
        }
        // Build a column-level patch. Use .update() (not save on the loaded
        // entity) — the entity carries `structure`/`titre_ref` relations, and
        // saving with those loaded-as-null would blank the FK we just set.
        const patch: Partial<ConcoursSubmission> = {};
        if (resolve.structure_id != null) {
            const structure = await this.structureRepository.findOne({ where: { id: resolve.structure_id } });
            if (!structure) throw new NotFoundException(`Structure avec l'ID ${resolve.structure_id} non trouvée`);
            patch.structure_id = resolve.structure_id;
            patch.proposed_structure = null;
        }
        if (resolve.titre_id != null) {
            const titre = await this.titreRepository.findOne({ where: { id: resolve.titre_id } });
            if (!titre) throw new NotFoundException(`Titre avec l'ID ${resolve.titre_id} non trouvé`);
            patch.titre_id = resolve.titre_id;
            patch.proposed_titre = null;
        }
        if (Object.keys(patch).length > 0) {
            await this.submissionRepository.update({ id, pays }, patch);
        }
        const reloaded = await this.loadOrThrow(pays, id);
        this.logger.log(`Soumission ${id} résolue (structure_id=${reloaded.structure_id}, titre_id=${reloaded.titre_id})`);
        return this.withMissingFlags(reloaded);
    }

    private async loadOrThrow(pays: string, id: number): Promise<ConcoursSubmission> {
        const submission = await this.submissionRepository.findOne({
            where: { id, pays },
            relations: ['structure', 'titre_ref', 'soumis_par'],
        });
        if (!submission) {
            throw new NotFoundException('Soumission non trouvée');
        }
        return submission;
    }

    // Best-effort decision email to the uploader — never fails the request.
    private notifyUploader(submission: ConcoursSubmission, status: string, concoursTitle: string) {
        const u = submission.soumis_par;
        if (!u?.email) {
            this.logger.log(`Soumission ${submission.id} sans email uploader — aucun email envoyé`);
            return;
        }
        const userName = u.prenom && u.nom
            ? `${u.prenom} ${u.nom}`
            : (u.prenom || u.nom || 'Utilisateur');
        this.mailService
            .sendServiceStatusUpdateEmail(u.email, userName, concoursTitle, status, 'concours')
            .catch(err => this.logger.error(`Échec envoi email soumission ${submission.id}: ${err.message}`));
    }

    // Admin: approve a submission. Both structure and titre MUST resolve to real
    // ids — the admin may bind newly-created/mapped ids via `resolve` here (they
    // overwrite any proposed_* name). A file is MANDATORY. Creates the real
    // concours (annee/lieu + auto-composed titre), then PROMOTES the submission's
    // file into the concours's own R2/Firebase key so the real row owns it.
    // Marks the submission approved and emails the uploader.
    async approve(pays: string, id: number, resolve?: { structure_id?: number; titre_id?: number }) {
        const submission = await this.loadOrThrow(pays, id);

        // A submission exists to collect the concours PDF — refuse to approve a
        // fileless one (would create a useless real concours).
        if (!submission.file_path && !submission.url) {
            throw new BadRequestException(
                'Aucun fichier attaché — la soumission doit contenir le fichier du concours avant approbation.',
            );
        }

        // Bind any resolved parent ids onto the submission, clearing the
        // matching proposed name now that it maps to a real row.
        if (resolve?.structure_id != null) {
            submission.structure_id = resolve.structure_id;
            submission.proposed_structure = null;
        }
        if (resolve?.titre_id != null) {
            submission.titre_id = resolve.titre_id;
            submission.proposed_titre = null;
        }

        if (submission.structure_id == null || submission.titre_id == null) {
            throw new BadRequestException(
                'La structure et le titre doivent être résolus (créés ou rattachés) avant approbation.',
            );
        }

        const structure = await this.structureRepository.findOne({ where: { id: submission.structure_id } });
        if (!structure) throw new NotFoundException(`Structure avec l'ID ${submission.structure_id} non trouvée`);
        const titre = await this.titreRepository.findOne({ where: { id: submission.titre_id } });
        if (!titre) throw new NotFoundException(`Titre avec l'ID ${submission.titre_id} non trouvé`);

        // Safety net: never create a duplicate real concours. If one already
        // exists for this pays + structure + titre + année (e.g. a sibling
        // submission was approved first), refuse — the admin should decline this
        // one instead of minting a duplicate.
        const existingConcours = await this.concoursRepository.findOne({
            where: {
                pays: submission.pays,
                structure_id: submission.structure_id,
                titre_id: submission.titre_id,
                annee: submission.annee == null ? IsNull() : submission.annee,
            },
        });
        if (existingConcours) {
            this.logger.warn(`Approbation refusée: concours identique #${existingConcours.id} existe déjà (soumission ${id})`);
            throw new ConflictException(
                `Un concours identique (structure, titre, année ${submission.annee ?? 'non précisée'}) existe déjà. Déclinez cette soumission.`,
            );
        }

        // Save first to obtain the concours's own gen_random_uuid()...
        const concours = this.concoursRepository.create({
            pays: submission.pays,
            structure_id: submission.structure_id,
            titre_id: submission.titre_id,
            annee: submission.annee ?? undefined,
            lieu: submission.lieu ?? undefined,
            titre: `${structure.nom} - ${titre.nom}`,
        });
        const savedConcours = await this.concoursRepository.save(concours);

        // ...then promote the file into the concours's OWN key. R2 copy is
        // canonical: if it throws, approval fails (the just-created concours row
        // stays, but the admin can retry; cleanup of orphans is out of scope).
        const promoted = await this.filesService.promoteFile(
            'concours_submissions', submission.uuid,
            'concours', savedConcours.uuid,
            'file', submission.file_extension,
        );
        savedConcours.file_path = promoted.file_path;
        savedConcours.file_extension = promoted.file_extension;
        savedConcours.url = promoted.url;
        await this.concoursRepository.save(savedConcours);

        submission.status = ServiceStatusEnum.APPROVED;
        await this.submissionRepository.save(submission);

        // Reward the uploader's wallet for the validated concours. Best-effort —
        // never undo the approval on failure. Idempotent via reference
        // EXAM_REWARD:<uuid> (re-approving does not double-credit).
        if (submission.soumis_par_id != null) {
            this.creditWalletFromExam
                .execute({ userId: submission.soumis_par_id, examId: savedConcours.uuid, description: 'Concours validé', resource: 'concours' })
                .then((res: any) => this.logger.log(`Wallet crédité (concours ${savedConcours.uuid}) pour user ${submission.soumis_par_id}${res?.duplicated ? ' [déjà crédité]' : ''}`))
                .catch(err => this.logger.error(`Crédit wallet échoué (soumission ${id}): ${err.message}`));
        }

        this.logger.log(`Soumission ${id} approuvée → concours ${savedConcours.id} (${savedConcours.titre}), fichier promu vers ${promoted.file_path}`);
        this.notifyUploader(submission, ServiceStatusEnum.APPROVED, savedConcours.titre);

        return { message: 'Soumission approuvée', submission: this.withMissingFlags(submission), concours: savedConcours };
    }

    // Admin: decline a submission + email the uploader. No real concours created.
    async decline(pays: string, id: number) {
        const submission = await this.loadOrThrow(pays, id);

        submission.status = ServiceStatusEnum.DECLINED;
        await this.submissionRepository.save(submission);

        const title = submission.structure?.nom && submission.titre_ref?.nom
            ? `${submission.structure.nom} - ${submission.titre_ref.nom}`
            : (submission.proposed_structure || submission.proposed_titre || 'Concours soumis');
        this.logger.log(`Soumission ${id} refusée`);
        this.notifyUploader(submission, ServiceStatusEnum.DECLINED, title);

        return { message: 'Soumission refusée', submission: this.withMissingFlags(submission) };
    }
}
