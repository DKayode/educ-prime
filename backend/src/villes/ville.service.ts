import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ville } from './entities/ville.entity';
import { Departement } from '../departements/entities/departement.entity';
import { CreerVilleDto } from './dto/creer-ville.dto';
import { MajVilleDto } from './dto/maj-ville.dto';
import { FilterVilleDto } from './dto/filter-ville.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { ImportSummary } from '../common/interfaces/import-summary.interface';
import { parseCsvLine } from '../common/utils/csv.util';

@Injectable()
export class VilleService {
  private readonly logger = new Logger(VilleService.name);

  constructor(
    @InjectRepository(Ville)
    private readonly villeRepository: Repository<Ville>,
    @InjectRepository(Departement)
    private readonly departementRepository: Repository<Departement>,
  ) {}

  // pays is DERIVED from the parent département (validated to belong to the
  // request country) — never taken from the request/DTO. This enforces the
  // cascade pays → département → ville.
  async create(pays: string, dto: CreerVilleDto): Promise<Ville> {
    const departement = await this.departementRepository.findOne({
      where: { id: dto.departement_id, pays },
    });
    if (!departement) {
      throw new NotFoundException(
        `Département ${dto.departement_id} introuvable pour ce pays`,
      );
    }

    const existing = await this.villeRepository.findOne({
      where: { nom: dto.nom, departement_id: dto.departement_id },
    });
    if (existing) {
      throw new ConflictException(
        `Une ville nommée "${dto.nom}" existe déjà dans ce département.`,
      );
    }

    const ville = this.villeRepository.create({
      nom: dto.nom,
      departement_id: dto.departement_id,
      pays: departement.pays,
    });
    const saved = await this.villeRepository.save(ville);
    this.logger.log(
      `Ville créée: ${saved.nom} (ID: ${saved.id}, dept: ${saved.departement_id}, pays: ${saved.pays})`,
    );
    return saved;
  }

  async findAll(
    pays: string,
    filterDto: FilterVilleDto,
  ): Promise<PaginationResponse<Ville>> {
    const { page = 1, limit = 10, search, sort_order = 'ASC', departement_id } = filterDto;

    const queryBuilder = this.villeRepository
      .createQueryBuilder('ville')
      .leftJoinAndSelect('ville.departement', 'departement')
      .where('ville.pays = :pays', { pays })
      .orderBy('ville.nom', sort_order)
      .skip((page - 1) * limit)
      .take(limit);

    if (departement_id) {
      queryBuilder.andWhere('ville.departement_id = :departement_id', { departement_id });
    }

    if (search) {
      queryBuilder.andWhere('unaccent(ville.nom) ILIKE unaccent(:search)', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(pays: string, id: string): Promise<Ville> {
    const ville = await this.villeRepository.findOne({
      where: { id: parseInt(id, 10), pays },
      relations: ['departement'],
    });
    if (!ville) {
      throw new NotFoundException('Ville non trouvée');
    }
    return ville;
  }

  async update(pays: string, id: string, dto: MajVilleDto): Promise<Ville> {
    const ville = await this.findOne(pays, id);

    let departement_id = ville.departement_id;
    let derivedPays = ville.pays;
    if (dto.departement_id && dto.departement_id !== ville.departement_id) {
      const departement = await this.departementRepository.findOne({
        where: { id: dto.departement_id, pays },
      });
      if (!departement) {
        throw new NotFoundException(
          `Département ${dto.departement_id} introuvable pour ce pays`,
        );
      }
      departement_id = dto.departement_id;
      derivedPays = departement.pays;
    }

    const nom = dto.nom ?? ville.nom;
    if (nom !== ville.nom || departement_id !== ville.departement_id) {
      const duplicate = await this.villeRepository.findOne({
        where: { nom, departement_id },
      });
      if (duplicate && duplicate.id !== ville.id) {
        throw new ConflictException(
          `Une ville nommée "${nom}" existe déjà dans ce département.`,
        );
      }
    }

    ville.nom = nom;
    ville.departement_id = departement_id;
    ville.pays = derivedPays;
    return this.villeRepository.save(ville);
  }

  async remove(pays: string, id: string): Promise<{ message: string }> {
    const ville = await this.findOne(pays, id);
    await this.villeRepository.remove(ville);
    return { message: 'Ville supprimée avec succès' };
  }

  // CSV columns: `departement_nom,ville_nom`. The département is resolved by
  // nom+pays; rows whose département does not exist are SKIPPED and reported
  // (never auto-created). Duplicates (ville nom + departement) are skipped.
  async importCsv(pays: string, file: Express.Multer.File): Promise<ImportSummary> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Aucun fichier CSV fourni');
    }

    const summary: ImportSummary = { created: 0, skipped: 0, errors: [] };
    const rawLines = file.buffer.toString('utf-8').split(/\r?\n/);
    let headerChecked = false;

    for (let i = 0; i < rawLines.length; i++) {
      const lineNo = i + 1;
      const line = rawLines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);

      if (!headerChecked) {
        headerChecked = true;
        const first = cols[0]?.toLowerCase();
        if (first === 'departement_nom' || first === 'departement') continue;
      }

      const departementNom = cols[0]?.trim();
      const villeNom = cols[1]?.trim();

      if (!departementNom || !villeNom) {
        summary.errors.push({
          line: lineNo,
          reason: 'departement_nom ou ville_nom manquant',
        });
        continue;
      }

      const departement = await this.departementRepository.findOne({
        where: { nom: departementNom, pays },
      });
      if (!departement) {
        summary.errors.push({
          line: lineNo,
          reason: `département "${departementNom}" introuvable pour ce pays`,
        });
        continue;
      }

      const existing = await this.villeRepository.findOne({
        where: { nom: villeNom, departement_id: departement.id },
      });
      if (existing) {
        summary.skipped++;
        continue;
      }

      const ville = this.villeRepository.create({
        nom: villeNom,
        departement_id: departement.id,
        pays: departement.pays,
      });
      await this.villeRepository.save(ville);
      summary.created++;
    }

    this.logger.log(
      `Import CSV villes (pays=${pays}): ${summary.created} créé(s), ${summary.skipped} ignoré(s), ${summary.errors.length} erreur(s)`,
    );
    return summary;
  }
}
