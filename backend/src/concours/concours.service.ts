import { Injectable, NotFoundException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { Repository } from 'typeorm';
import { Concours } from './entities/concours.entity';
import { Structure } from '../structure/entities/structure.entity';
import { Titre } from '../titre/entities/titre.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CreateConcoursDto } from './dto/create-concours.dto';
import { UpdateConcoursDto } from './dto/update-concours.dto';
import { FilterConcoursDto } from './dto/filter-concours.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceStatusEnum } from '../common/enums/service-status.enum';
import { FindOptionsWhere, Like, Brackets, Not, IsNull } from 'typeorm';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ConcoursService {
  private readonly logger = new Logger(ConcoursService.name);

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly fichiersService: FichiersService,
    private readonly mailService: MailService,
  ) { }

  private get concoursRepository(): Repository<Concours> {
    return this.resolver.getRepository(Concours);
  }

  private get structureRepository(): Repository<Structure> {
    return this.resolver.getRepository(Structure);
  }

  private get titreRepository(): Repository<Titre> {
    return this.resolver.getRepository(Titre);
  }

  private async fetchStructureOrThrow(id: number): Promise<Structure> {
    const structure = await this.structureRepository.findOne({ where: { id } });
    if (!structure) {
      throw new NotFoundException(`Structure avec l'ID ${id} non trouvée`);
    }
    return structure;
  }

  private async fetchTitreOrThrow(id: number): Promise<Titre> {
    const titre = await this.titreRepository.findOne({ where: { id } });
    if (!titre) {
      throw new NotFoundException(`Titre avec l'ID ${id} non trouvé`);
    }
    return titre;
  }

  // Auto-composes the legacy free-text `titre` column (still read by mobile)
  // from the referenced structure + titre lookup rows. 404s if either id is
  // unknown. Format: "<structure.nom> - <titre.nom>".
  private async composeTitre(structureId: number, titreId: number): Promise<string> {
    const structure = await this.fetchStructureOrThrow(structureId);
    const titreRef = await this.fetchTitreOrThrow(titreId);
    return `${structure.nom} - ${titreRef.nom}`;
  }

  // POST /concours — any authenticated user creates a concours. The file
  // itself is NOT sent here; the client uploads it afterwards via the standard
  // /files/concours/:uuid/file flow using the returned uuid. Rejects (409) if a
  // NON-declined concours with the same (structure_id, titre_id, annee) already
  // exists in the same pays — a previously declined tuple may be re-created.
  // Admin → auto-approved; any other user → pending_approval. soumis_par_id is
  // the caller (everyone). titre is server-composed.
  async create(pays: string, createConcoursDto: CreateConcoursDto, userId: number, isAdmin: boolean) {
    const { structure_id, titre_id, annee } = createConcoursDto;
    this.logger.log(`Création d'un concours par utilisateur ${userId} (admin=${isAdmin}, structure ${structure_id}, titre ${titre_id}, annee ${annee}, pays ${pays})`);

    const existing = await this.concoursRepository.findOne({
      where: {
        pays,
        structure_id,
        titre_id,
        annee: annee == null ? IsNull() : annee,
        status: Not(ServiceStatusEnum.DECLINED),
      },
    });
    if (existing) {
      this.logger.warn(`Doublon concours (structure ${structure_id}, titre ${titre_id}, annee ${annee}, pays ${pays}) — création refusée`);
      throw new ConflictException(
        `Un concours pour cette structure, ce titre et cette année (${annee ?? 'non précisée'}) existe déjà.`,
      );
    }

    const newConcours = this.concoursRepository.create({ ...createConcoursDto, pays });
    // structure_id + titre_id are required at create; the legacy titre column
    // is always server-composed (never the manually-typed value).
    newConcours.titre = await this.composeTitre(structure_id, titre_id);
    newConcours.status = isAdmin ? ServiceStatusEnum.APPROVED : ServiceStatusEnum.PENDING_APPROVAL;
    newConcours.soumis_par_id = userId;

    const saved = await this.concoursRepository.save(newConcours);
    this.logger.log(`Concours créé: ${saved.titre} (ID: ${saved.id}, status ${saved.status}, soumis_par ${userId})`);
    return saved;
  }

  // PATCH /concours/:id/status — admin approves/declines a concours
  // (pays-scoped). Emails the uploader best-effort (skipped if soumis_par_id
  // is null, i.e. admin-created/legacy). Mirrors ServicesService.updateStatus.
  async updateStatus(pays: string, id: number, status: ServiceStatusEnum) {
    this.logger.log(`Mise à jour du statut concours ID ${id} → ${status} (pays=${pays})`);
    const concours = await this.concoursRepository.findOne({
      where: { id, pays },
      relations: ['soumis_par'],
    });
    if (!concours) {
      this.logger.warn(`Concours ID ${id} introuvable (pays=${pays}) pour changement de statut`);
      throw new NotFoundException('Concours non trouvé');
    }

    const previousStatus = concours.status;
    concours.status = status;
    await this.concoursRepository.save(concours);

    // Best-effort notification — never fails the request.
    if (previousStatus !== status && concours.soumis_par?.email) {
      const u = concours.soumis_par;
      const userName = u.prenom && u.nom
        ? `${u.prenom} ${u.nom}`
        : (u.prenom || u.nom || 'Utilisateur');
      this.mailService
        .sendServiceStatusUpdateEmail(u.email, userName, concours.titre, status, 'concours')
        .catch(err => this.logger.error(`Échec envoi email statut concours ${id}: ${err.message}`));
    } else if (!concours.soumis_par_id) {
      this.logger.log(`Concours ${id} sans soumis_par_id — aucun email à envoyer`);
    }

    return concours;
  }

  async findAll(filterDto: FilterConcoursDto, isAdmin: boolean): Promise<PaginationResponse<Concours>> {
    const { page = 1, limit = 10, search, annee, sort_by = 'titre', sort_order = 'ASC', status } = filterDto;
    this.logger.log(`Récupération des concours (admin=${isAdmin}) - filtres: ${JSON.stringify(filterDto)}`);

    const queryBuilder = this.concoursRepository.createQueryBuilder('concours')
      .leftJoinAndSelect('concours.structure', 'structure')
      .leftJoinAndSelect('concours.titre_ref', 'titre_ref');

    // Status gating: non-admins only ever see approved concours; admins see
    // every status and may narrow to one via the ?status= filter.
    if (!isAdmin) {
      queryBuilder.andWhere('concours.status = :status', { status: ServiceStatusEnum.APPROVED });
    } else if (status) {
      queryBuilder.andWhere('concours.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(unaccent(concours.titre) ILIKE unaccent(:search) OR unaccent(concours.lieu) ILIKE unaccent(:search))',
        { search: `%${search}%` }
      );
    }

    if (annee) {
      queryBuilder.andWhere('concours.annee = :annee', { annee });
    }

    // Sorting
    const sortByColumn = sort_by === 'titre' ? 'concours.titre' : 'concours.annee';
    queryBuilder.orderBy(sortByColumn, 'ASC');

    // If sorting by titre, add secondary sort by date/id for stability if needed, or leave as simple sort
    if (sort_by === 'titre') {
      queryBuilder.addOrderBy('concours.annee', 'DESC');
    }

    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [concours, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`${concours.length} concours trouvé(s) sur ${total} total`);

    return {
      data: concours,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAnnees(isAdmin: boolean): Promise<number[]> {
    this.logger.log(`Récupération des années disponibles (admin=${isAdmin})`);
    const qb = this.concoursRepository
      .createQueryBuilder('concours')
      .select('DISTINCT concours.annee', 'annee')
      .where('concours.annee IS NOT NULL');

    if (!isAdmin) {
      qb.andWhere('concours.status = :status', { status: ServiceStatusEnum.APPROVED });
    }

    const result = await qb.orderBy('concours.annee', 'DESC').getRawMany();

    return result.map(r => r.annee);
  }

  // GET /v1/concours — concours grouped by their official title, i.e. the
  // pair (structure_id, titre_id). Mirrors the niveau-etude/matieres
  // `grouper-par-nom` 3-step pattern (count groups → paginate group keys →
  // fetch full rows for the page's keys), pays-scoped. Non-admin callers only
  // see `approved` rows; admins see every status. Each group nests its
  // per-year instances ordered by annee DESC.
  async findGroupedByTitle(
    pays: string,
    paginationDto: PaginationDto,
    isAdmin: boolean,
  ): Promise<PaginationResponse<any>> {
    const { page = 1, limit = 10, search } = paginationDto;
    this.logger.log(`Concours groupés (pays=${pays}, admin=${isAdmin}, page=${page}, limit=${limit}, search=${search})`);

    const applyScope = (qb: any) => {
      qb.where('concours.pays = :pays', { pays });
      if (!isAdmin) {
        qb.andWhere('concours.status = :status', { status: ServiceStatusEnum.APPROVED });
      }
      if (search) {
        qb.andWhere(new Brackets((b) => {
          b.where('unaccent(structure.nom) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(titre_ref.nom) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(concours.titre) ILIKE unaccent(:search)', { search: `%${search}%` });
        }));
      }
      return qb;
    };

    // 1. Count the distinct (structure_id, titre_id) groups. COALESCE so a
    //    legacy row with null FK(s) still forms a countable group (real ids
    //    are >= 1, so 0 is a safe NULL sentinel here).
    const countRow = await applyScope(
      this.concoursRepository.createQueryBuilder('concours')
        .leftJoin('concours.structure', 'structure')
        .leftJoin('concours.titre_ref', 'titre_ref')
        .select('COUNT(DISTINCT (COALESCE(concours.structure_id, 0), COALESCE(concours.titre_id, 0)))', 'count'),
    ).getRawOne();
    const total = parseInt(countRow?.count ?? '0', 10);

    if (total === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // 2. Paginate the group keys, ordered by official title (structure then
    //    titre name, NULLs last).
    const rawKeys = await applyScope(
      this.concoursRepository.createQueryBuilder('concours')
        .leftJoin('concours.structure', 'structure')
        .leftJoin('concours.titre_ref', 'titre_ref')
        .select('concours.structure_id', 'structure_id')
        .addSelect('concours.titre_id', 'titre_id')
        .addSelect('structure.nom', 'structure_nom')
        .addSelect('titre_ref.nom', 'titre_nom')
        .distinct(true),
    )
      .orderBy('structure_nom', 'ASC', 'NULLS LAST')
      .addOrderBy('titre_nom', 'ASC', 'NULLS LAST')
      .limit(limit)
      .offset((page - 1) * limit)
      .getRawMany();

    const keys = rawKeys.map(k => ({
      structure_id: k.structure_id === null ? null : Number(k.structure_id),
      titre_id: k.titre_id === null ? null : Number(k.titre_id),
    }));

    // 3. Fetch the full concours rows for the page's group keys, with their
    //    structure/titre relations, ordered by annee DESC within each group.
    const rowsQb = applyScope(
      this.concoursRepository.createQueryBuilder('concours')
        .leftJoinAndSelect('concours.structure', 'structure')
        .leftJoinAndSelect('concours.titre_ref', 'titre_ref'),
    );
    rowsQb.andWhere(new Brackets((b) => {
      keys.forEach((k, i) => {
        const pair = new Brackets((bb) => {
          if (k.structure_id === null) bb.where('concours.structure_id IS NULL');
          else bb.where(`concours.structure_id = :s${i}`, { [`s${i}`]: k.structure_id });
          if (k.titre_id === null) bb.andWhere('concours.titre_id IS NULL');
          else bb.andWhere(`concours.titre_id = :t${i}`, { [`t${i}`]: k.titre_id });
        });
        i === 0 ? b.where(pair) : b.orWhere(pair);
      });
    }));
    rowsQb.orderBy('concours.annee', 'DESC', 'NULLS LAST');
    const rows = await rowsQb.getMany();

    // Group rows by (structure_id, titre_id), preserving the key page order.
    const groupKey = (s: number | null, t: number | null) => `${s ?? 'null'}|${t ?? 'null'}`;
    const grouped = new Map<string, any>();
    keys.forEach((k) => {
      grouped.set(groupKey(k.structure_id, k.titre_id), {
        structure: null,
        titre_ref: null,
        official_title: '',
        annees: [] as number[],
        concours: [] as Concours[],
      });
    });

    rows.forEach((row) => {
      const group = grouped.get(groupKey(row.structure_id ?? null, row.titre_id ?? null));
      if (!group) return;
      if (group.concours.length === 0) {
        group.structure = row.structure ?? null;
        group.titre_ref = row.titre_ref ?? null;
        group.official_title = row.structure && row.titre_ref
          ? `${row.structure.nom} - ${row.titre_ref.nom}`
          : (row.titre || '');
      }
      group.concours.push(row);
      if (row.annee != null && !group.annees.includes(row.annee)) {
        group.annees.push(row.annee);
      }
    });

    const data = Array.from(grouped.values());

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, isAdmin: boolean) {
    this.logger.log(`Recherche du concours ID: ${id} (admin=${isAdmin})`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
      relations: ['structure', 'titre_ref'],
    });

    if (!concours) {
      this.logger.warn(`Concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }

    // Don't leak non-approved concours to non-admins: behave as if absent.
    if (!isAdmin && concours.status !== ServiceStatusEnum.APPROVED) {
      this.logger.warn(`Concours ID ${id} (status=${concours.status}) masqué pour non-admin`);
      throw new NotFoundException('Concours non trouvé');
    }

    this.logger.log(`Concours trouvé: ${concours.titre} (ID: ${id})`);
    return concours;
  }

  async findOneForDownload(id: number, isAdmin: boolean): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche du concours pour téléchargement - ID: ${id} (admin=${isAdmin})`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
    });

    if (!concours) {
      this.logger.warn(`Concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }

    if (!isAdmin && concours.status !== ServiceStatusEnum.APPROVED) {
      this.logger.warn(`Concours ID ${id} (status=${concours.status}) masqué pour non-admin (download)`);
      throw new NotFoundException('Concours non trouvé');
    }

    if (!concours.url) {
      this.logger.warn(`Concours ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Ce concours n\'a pas de fichier associé');
    }

    this.logger.log(`Concours trouvé pour téléchargement: ${concours.titre} (ID: ${id})`);

    // Increment download count
    concours.nombre_telechargements = (concours.nombre_telechargements || 0) + 1;
    await this.concoursRepository.save(concours);

    return { url: concours.url, titre: concours.titre };
  }

  async update(id: number, updateConcoursDto: UpdateConcoursDto) {
    this.logger.log(`Mise à jour du concours ID: ${id}`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
    });

    if (!concours) {
      this.logger.warn(`Mise à jour échouée: concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }

    const structureChanged = updateConcoursDto.structure_id !== undefined;
    const titreChanged = updateConcoursDto.titre_id !== undefined;

    Object.assign(concours, updateConcoursDto);

    // When either reference changes, re-validate and re-compose the legacy
    // titre column from the (effective) structure + titre rows. Composition
    // needs BOTH refs — guards a legacy row (null FKs) being partially updated.
    if (structureChanged || titreChanged) {
      if (concours.structure_id == null || concours.titre_id == null) {
        throw new BadRequestException(
          'structure_id et titre_id sont tous deux requis pour composer le titre du concours',
        );
      }
      concours.titre = await this.composeTitre(concours.structure_id, concours.titre_id);
    }

    const updated = await this.concoursRepository.save(concours);
    this.logger.log(`Concours mis à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: number) {
    this.logger.log(`Suppression du concours ID: ${id}`);
    const concours = await this.concoursRepository.findOne({
      where: { id },
    });

    if (!concours) {
      this.logger.warn(`Suppression échouée: concours ID ${id} introuvable`);
      throw new NotFoundException('Concours non trouvé');
    }


    if (concours.url) {
      try {
        await this.fichiersService.deleteFile(concours.url);
      } catch (error) {
        this.logger.warn(`Failed to delete file for concours ${id}: ${error.message}`);
      }
    }

    await this.concoursRepository.remove(concours);
    this.logger.log(`Concours supprimé: ${concours.titre} (ID: ${id})`);
    return { message: 'Concours supprimé avec succès' };
  }
}
