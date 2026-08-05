import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { ExamenNationalSubmission } from './entities/examen-national-submission.entity';
import { ExamenNational } from './entities/examen-national.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { Serie } from '../series/entities/serie.entity';
import { MatiereExamen } from '../matieres-examen/entities/matiere-examen.entity';
import { FiliereExamen } from '../filieres-examen/entities/filiere-examen.entity';
import { ServiceStatusEnum } from '../common/enums/service-status.enum';
import { CreateExamenNationalSubmissionDto } from './dto/create-examen-national-submission.dto';
import { ResoudreExamenNationalSubmissionDto } from './dto/resoudre-examen-national-submission.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { MailService } from '../mail/mail.service';
import { FilesService } from '../files/files.service';
import { CreditWalletFromValidatedExamUseCase } from '../wallet/wallet-balance/use-cases/credit-wallet-from-validated-exam.use-case';

@Injectable()
export class ExamensNationauxSubmissionsService {
    private readonly logger = new Logger(ExamensNationauxSubmissionsService.name);

    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly mailService: MailService,
        private readonly filesService: FilesService,
        private readonly creditWalletFromExam: CreditWalletFromValidatedExamUseCase,
    ) { }

    private get subRepo(): Repository<ExamenNationalSubmission> { return this.resolver.getRepository(ExamenNationalSubmission); }
    private get examRepo(): Repository<ExamenNational> { return this.resolver.getRepository(ExamenNational); }
    private get typeRepo(): Repository<TypeExamen> { return this.resolver.getRepository(TypeExamen); }
    private get serieRepo(): Repository<Serie> { return this.resolver.getRepository(Serie); }
    private get matiereRepo(): Repository<MatiereExamen> { return this.resolver.getRepository(MatiereExamen); }
    private get filiereRepo(): Repository<FiliereExamen> { return this.resolver.getRepository(FiliereExamen); }

    private withMissingFlags(s: ExamenNationalSubmission) {
        const u = s.soumis_par;
        const soumis_par = u ? { id: u.id, uuid: u.uuid, nom: u.nom, prenom: u.prenom, email: u.email } : null;
        return {
            ...s,
            soumis_par,
            missing_type: s.type_examen_id == null,
            // série is optional: only "missing" when a name was proposed but not yet resolved.
            missing_serie: s.serie_id == null && s.proposed_serie != null,
            missing_matiere: s.matiere_examen_id == null && s.proposed_matiere != null,
            missing_filiere: s.filiere_examen_id == null && s.proposed_filiere != null,
            // At least one resolved classifier (matière OR filière) is required to approve.
            missing_classifier: s.matiere_examen_id == null && s.filiere_examen_id == null,
        };
    }

    private async loadOrThrow(pays: string, id: number): Promise<ExamenNationalSubmission> {
        const s = await this.subRepo.findOne({
            where: { id, pays },
            relations: ['type_examen', 'serie', 'matiere_examen', 'filiere_examen', 'soumis_par'],
        });
        if (!s) throw new NotFoundException('Soumission non trouvée');
        return s;
    }

    async createSubmission(pays: string, userId: number, dto: CreateExamenNationalSubmissionDto) {
        const proposedType = dto.proposed_type?.trim() || null;
        const proposedSerie = dto.proposed_serie?.trim() || null;
        const proposedMatiere = dto.proposed_matiere?.trim() || null;
        const proposedFiliere = dto.proposed_filiere?.trim() || null;

        const hasType = dto.type_examen_id != null || !!proposedType;
        const hasMatiere = dto.matiere_examen_id != null || !!proposedMatiere;
        const hasFiliere = dto.filiere_examen_id != null || !!proposedFiliere;
        if (!hasType) {
            throw new BadRequestException('Le type est requis (id existant ou nom proposé).');
        }
        if (!hasMatiere && !hasFiliere) {
            throw new BadRequestException('Au moins une matière ou une filière est requise (id existant ou nom proposé).');
        }
        if (dto.type_examen_id != null && !(await this.typeRepo.findOne({ where: { id: dto.type_examen_id } }))) {
            throw new NotFoundException(`Type d'examen ${dto.type_examen_id} introuvable`);
        }
        if (dto.matiere_examen_id != null && !(await this.matiereRepo.findOne({ where: { id: dto.matiere_examen_id } }))) {
            throw new NotFoundException(`Matière ${dto.matiere_examen_id} introuvable`);
        }
        if (dto.filiere_examen_id != null && !(await this.filiereRepo.findOne({ where: { id: dto.filiere_examen_id } }))) {
            throw new NotFoundException(`Filière ${dto.filiere_examen_id} introuvable`);
        }

        const submission = this.subRepo.create({
            pays,
            type_examen_id: dto.type_examen_id ?? null,
            proposed_type: dto.type_examen_id != null ? null : proposedType,
            serie_id: dto.serie_id ?? null,
            proposed_serie: dto.serie_id != null ? null : proposedSerie,
            matiere_examen_id: dto.matiere_examen_id ?? null,
            proposed_matiere: dto.matiere_examen_id != null ? null : proposedMatiere,
            filiere_examen_id: dto.filiere_examen_id ?? null,
            proposed_filiere: dto.filiere_examen_id != null ? null : proposedFiliere,
            section: dto.section?.trim() || null,
            annee: dto.annee ?? null,
            soumis_par_id: userId,
            status: ServiceStatusEnum.PENDING_APPROVAL,
        });
        const saved = await this.subRepo.save(submission);
        this.logger.log(`Soumission examen national créée (ID ${saved.id}, uuid ${saved.uuid}, pays ${pays})`);
        return this.withMissingFlags(saved);
    }

    async findAll(pays: string, status: string | undefined, paginationDto: PaginationDto): Promise<PaginationResponse<any>> {
        const { page = 1, limit = 10 } = paginationDto;
        // 'all' → no status filter; undefined → default to pending_approval.
        const effectiveStatus = status === 'all' ? null : (status || ServiceStatusEnum.PENDING_APPROVAL);
        const qb = this.subRepo.createQueryBuilder('s')
            .leftJoinAndSelect('s.type_examen', 'type_examen')
            .leftJoinAndSelect('s.serie', 'serie')
            .leftJoinAndSelect('s.matiere_examen', 'matiere_examen')
            .leftJoinAndSelect('s.filiere_examen', 'filiere_examen')
            .leftJoin('s.soumis_par', 'soumis_par')
            .addSelect(['soumis_par.id', 'soumis_par.uuid', 'soumis_par.nom', 'soumis_par.prenom', 'soumis_par.email'])
            .where('s.pays = :pays', { pays })
            .orderBy('s.date_creation', 'ASC')
            .skip((page - 1) * limit).take(limit);
        if (effectiveStatus) qb.andWhere('s.status = :status', { status: effectiveStatus });
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows.map(r => this.withMissingFlags(r)), total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findMine(pays: string, soumisParId: number, status: string | undefined, paginationDto: PaginationDto): Promise<PaginationResponse<any>> {
        const { page = 1, limit = 10 } = paginationDto;
        const qb = this.subRepo.createQueryBuilder('s')
            .leftJoinAndSelect('s.type_examen', 'type_examen')
            .leftJoinAndSelect('s.serie', 'serie')
            .leftJoinAndSelect('s.matiere_examen', 'matiere_examen')
            .leftJoinAndSelect('s.filiere_examen', 'filiere_examen')
            .where('s.pays = :pays', { pays })
            .andWhere('s.soumis_par_id = :soumisParId', { soumisParId })
            .orderBy('s.date_creation', 'DESC')
            .skip((page - 1) * limit).take(limit);
        if (status) qb.andWhere('s.status = :status', { status });
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows.map(r => this.withMissingFlags(r)), total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async resolveSubmission(pays: string, id: number, resolve: ResoudreExamenNationalSubmissionDto) {
        const submission = await this.loadOrThrow(pays, id);
        if (submission.status !== ServiceStatusEnum.PENDING_APPROVAL) {
            throw new BadRequestException('Seule une soumission en attente peut être modifiée.');
        }
        const patch: Partial<ExamenNationalSubmission> = {};

        if (resolve.type_examen_id != null) {
            if (!(await this.typeRepo.findOne({ where: { id: resolve.type_examen_id } }))) throw new NotFoundException(`Type ${resolve.type_examen_id} introuvable`);
            patch.type_examen_id = resolve.type_examen_id; patch.proposed_type = null;
        } else if (resolve.proposed_type !== undefined) {
            patch.proposed_type = resolve.proposed_type?.trim() || null;
            if (patch.proposed_type) patch.type_examen_id = null;
        }

        if (resolve.serie_id != null) {
            if (!(await this.serieRepo.findOne({ where: { id: resolve.serie_id } }))) throw new NotFoundException(`Série ${resolve.serie_id} introuvable`);
            patch.serie_id = resolve.serie_id; patch.proposed_serie = null;
        } else if (resolve.proposed_serie !== undefined) {
            patch.proposed_serie = resolve.proposed_serie?.trim() || null;
            if (patch.proposed_serie) patch.serie_id = null;
        }

        if (resolve.matiere_examen_id != null) {
            if (!(await this.matiereRepo.findOne({ where: { id: resolve.matiere_examen_id } }))) throw new NotFoundException(`Matière ${resolve.matiere_examen_id} introuvable`);
            patch.matiere_examen_id = resolve.matiere_examen_id; patch.proposed_matiere = null;
        } else if (resolve.proposed_matiere !== undefined) {
            patch.proposed_matiere = resolve.proposed_matiere?.trim() || null;
            if (patch.proposed_matiere) patch.matiere_examen_id = null;
        }

        if (resolve.filiere_examen_id != null) {
            if (!(await this.filiereRepo.findOne({ where: { id: resolve.filiere_examen_id } }))) throw new NotFoundException(`Filière ${resolve.filiere_examen_id} introuvable`);
            patch.filiere_examen_id = resolve.filiere_examen_id; patch.proposed_filiere = null;
        } else if (resolve.proposed_filiere !== undefined) {
            patch.proposed_filiere = resolve.proposed_filiere?.trim() || null;
            if (patch.proposed_filiere) patch.filiere_examen_id = null;
        }

        if (resolve.section !== undefined) patch.section = resolve.section?.trim() || null;
        if (resolve.annee !== undefined) patch.annee = resolve.annee;

        if (Object.keys(patch).length > 0) await this.subRepo.update({ id, pays }, patch);
        const reloaded = await this.loadOrThrow(pays, id);
        return this.withMissingFlags(reloaded);
    }

    private notifyUploader(submission: ExamenNationalSubmission, status: string, title: string, reason?: string) {
        const u = submission.soumis_par;
        if (!u?.email) return;
        const userName = u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.prenom || u.nom || 'Utilisateur');
        this.mailService
            .sendServiceStatusUpdateEmail(u.email, userName, title, status, 'examen national', reason)
            .catch(err => this.logger.error(`Échec envoi email soumission ${submission.id}: ${err.message}`));
    }

    async approve(
        pays: string, id: number,
        resolve?: { type_examen_id?: number; serie_id?: number; matiere_examen_id?: number; filiere_examen_id?: number },
    ) {
        const submission = await this.loadOrThrow(pays, id);
        if (!submission.file_path && !submission.url) {
            throw new BadRequestException('Aucun fichier attaché — la soumission doit contenir le fichier avant approbation.');
        }
        if (resolve?.type_examen_id != null) { submission.type_examen_id = resolve.type_examen_id; submission.proposed_type = null; }
        if (resolve?.serie_id != null) { submission.serie_id = resolve.serie_id; submission.proposed_serie = null; }
        if (resolve?.matiere_examen_id != null) { submission.matiere_examen_id = resolve.matiere_examen_id; submission.proposed_matiere = null; }
        if (resolve?.filiere_examen_id != null) { submission.filiere_examen_id = resolve.filiere_examen_id; submission.proposed_filiere = null; }

        if (submission.type_examen_id == null) {
            throw new BadRequestException('Le type doit être résolu avant approbation.');
        }
        if (submission.matiere_examen_id == null && submission.filiere_examen_id == null) {
            throw new BadRequestException('Au moins une matière ou une filière doit être résolue avant approbation.');
        }
        if (submission.annee == null) throw new BadRequestException("L'année est requise avant approbation.");

        const type = await this.typeRepo.findOne({ where: { id: submission.type_examen_id } });
        if (!type) throw new NotFoundException(`Type ${submission.type_examen_id} introuvable`);
        const serie = submission.serie_id != null ? await this.serieRepo.findOne({ where: { id: submission.serie_id } }) : null;
        const matiere = submission.matiere_examen_id != null ? await this.matiereRepo.findOne({ where: { id: submission.matiere_examen_id } }) : null;
        const filiere = submission.filiere_examen_id != null ? await this.filiereRepo.findOne({ where: { id: submission.filiere_examen_id } }) : null;

        const titre = [type.nom, serie?.nom, filiere?.nom, matiere?.nom, String(submission.annee)].filter(Boolean).join(' - ');
        const examen = this.examRepo.create({
            pays: submission.pays,
            type_examen_id: submission.type_examen_id,
            serie_id: submission.serie_id ?? undefined,
            matiere_examen_id: submission.matiere_examen_id ?? undefined,
            filiere_examen_id: submission.filiere_examen_id ?? undefined,
            section: submission.section ?? undefined,
            annee: submission.annee,
            titre,
        });
        const saved = await this.examRepo.save(examen);

        const promoted = await this.filesService.promoteFile(
            'examens_nationaux_submissions', submission.uuid,
            'examens_nationaux', saved.uuid,
            'file', submission.file_extension,
        );
        saved.file_path = promoted.file_path;
        saved.file_extension = promoted.file_extension;
        saved.url = promoted.url;
        await this.examRepo.save(saved);

        submission.status = ServiceStatusEnum.APPROVED;
        await this.subRepo.save(submission);

        // Reward the uploader's wallet — best-effort, never undoes the approval.
        // Idempotent via reference EXAM_REWARD:<uuid> (re-approving never double-credits).
        if (submission.soumis_par_id != null) {
            this.creditWalletFromExam
                .execute({ userId: submission.soumis_par_id, examId: saved.uuid, description: 'Examen national validé', resource: 'examen_national' })
                .then((res: any) => this.logger.log(`Wallet crédité (examen national ${saved.uuid}) pour user ${submission.soumis_par_id}${res?.duplicated ? ' [déjà crédité]' : ''}`))
                .catch(err => this.logger.error(`Crédit wallet échoué (soumission ${id}): ${err.message}`));
        }

        this.logger.log(`Soumission ${id} approuvée → examen national ${saved.id} (${saved.titre})`);
        this.notifyUploader(submission, ServiceStatusEnum.APPROVED, saved.titre);
        return { message: 'Soumission approuvée', submission: this.withMissingFlags(submission), examen_national: saved };
    }

    async decline(pays: string, id: number, reason?: string) {
        const submission = await this.loadOrThrow(pays, id);
        submission.status = ServiceStatusEnum.DECLINED;
        submission.decline_reason = reason?.trim() || null;
        await this.subRepo.save(submission);
        const title = submission.type_examen?.nom
            ? [submission.type_examen?.nom, submission.serie?.nom, submission.filiere_examen?.nom, submission.matiere_examen?.nom].filter(Boolean).join(' - ')
            : (submission.proposed_type || submission.proposed_matiere || submission.proposed_filiere || 'Examen national soumis');
        this.notifyUploader(submission, ServiceStatusEnum.DECLINED, title, submission.decline_reason ?? undefined);
        return { message: 'Soumission refusée', submission: this.withMissingFlags(submission) };
    }
}
