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

@Injectable()
export class ConcoursSubmissionsService {
    private readonly logger = new Logger(ConcoursSubmissionsService.name);

    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly mailService: MailService,
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

    // Decorate a submission with which parent(s) still need admin resolution.
    private withMissingFlags(s: ConcoursSubmission) {
        return {
            ...s,
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
            .leftJoinAndSelect('submission.soumis_par', 'soumis_par')
            .where('submission.pays = :pays', { pays })
            .andWhere('submission.status = :status', { status: effectiveStatus })
            .orderBy('submission.date_creation', 'DESC')
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
    // overwrite any proposed_* name). Creates the real concours (annee/lieu +
    // the submission's file/url + auto-composed titre), marks the submission
    // approved, and emails the uploader.
    async approve(pays: string, id: number, resolve?: { structure_id?: number; titre_id?: number }) {
        const submission = await this.loadOrThrow(pays, id);

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

        const concours = this.concoursRepository.create({
            pays: submission.pays,
            structure_id: submission.structure_id,
            titre_id: submission.titre_id,
            annee: submission.annee ?? undefined,
            lieu: submission.lieu ?? undefined,
            file_path: submission.file_path || '',
            file_extension: submission.file_extension || '',
            url: submission.url || undefined,
            titre: `${structure.nom} - ${titre.nom}`,
        });
        const savedConcours = await this.concoursRepository.save(concours);

        submission.status = ServiceStatusEnum.APPROVED;
        await this.submissionRepository.save(submission);

        this.logger.log(`Soumission ${id} approuvée → concours ${savedConcours.id} (${savedConcours.titre})`);
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
