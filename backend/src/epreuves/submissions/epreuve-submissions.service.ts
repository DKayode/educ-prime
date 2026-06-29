import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../../config/data-source-resolver.service';
import { EpreuveSubmission } from './entities/epreuve-submission.entity';
import { Epreuve, EpreuveSection } from '../entities/epreuve.entity';
import { Etablissement } from '../../etablissements/entities/etablissement.entity';
import { Filiere } from '../../filieres/entities/filiere.entity';
import { NiveauEtude } from '../../niveau-etude/entities/niveau-etude.entity';
import { Matiere } from '../../matieres/entities/matiere.entity';
import { ServiceStatusEnum } from '../../common/enums/service-status.enum';
import { CreerSubmissionDto } from './dto/creer-submission.dto';

@Injectable()
export class EpreuveSubmissionsService {
  private readonly logger = new Logger(EpreuveSubmissionsService.name);

  constructor(private readonly resolver: DataSourceResolver) { }

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
}
