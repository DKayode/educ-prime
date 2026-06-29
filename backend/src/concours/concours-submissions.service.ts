import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { ConcoursSubmission } from './entities/concours-submission.entity';
import { Concours } from './entities/concours.entity';
import { Structure } from '../structure/entities/structure.entity';
import { Titre } from '../titre/entities/titre.entity';
import { ServiceStatusEnum } from '../common/enums/service-status.enum';
import { CreateConcoursSubmissionDto } from './dto/create-concours-submission.dto';

@Injectable()
export class ConcoursSubmissionsService {
    private readonly logger = new Logger(ConcoursSubmissionsService.name);

    constructor(private readonly resolver: DataSourceResolver) { }

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
}
