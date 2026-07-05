import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Departement } from './entities/departement.entity';
import { CreerDepartementDto } from './dto/creer-departement.dto';
import { MajDepartementDto } from './dto/maj-departement.dto';
import { FilterDepartementDto } from './dto/filter-departement.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { ImportSummary } from '../common/interfaces/import-summary.interface';
import { parseCsvLine } from '../common/utils/csv.util';

@Injectable()
export class DepartementService {
  private readonly logger = new Logger(DepartementService.name);

  constructor(
    @InjectRepository(Departement)
    private readonly departementRepository: Repository<Departement>,
  ) {}

  async create(pays: string, dto: CreerDepartementDto): Promise<Departement> {
    const existing = await this.departementRepository.findOne({
      where: { nom: dto.nom, pays },
    });
    if (existing) {
      throw new ConflictException(
        `Un département nommé "${dto.nom}" existe déjà pour ce pays.`,
      );
    }
    const departement = this.departementRepository.create({ ...dto, pays });
    const saved = await this.departementRepository.save(departement);
    this.logger.log(`Département créé: ${saved.nom} (ID: ${saved.id}, pays: ${saved.pays})`);
    return saved;
  }

  async findAll(
    pays: string,
    filterDto: FilterDepartementDto,
  ): Promise<PaginationResponse<Departement>> {
    const { page = 1, limit = 10, search, sort_order = 'ASC' } = filterDto;

    const queryBuilder = this.departementRepository
      .createQueryBuilder('departement')
      .where('departement.pays = :pays', { pays })
      .orderBy('departement.nom', sort_order)
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(departement.nom) ILIKE unaccent(:search)', {
            search: `%${search}%`,
          }).orWhere('unaccent(departement.code) ILIKE unaccent(:search)', {
            search: `%${search}%`,
          });
        }),
      );
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

  async findOne(pays: string, id: string): Promise<Departement> {
    const departement = await this.departementRepository.findOne({
      where: { id, pays },
    });
    if (!departement) {
      throw new NotFoundException('Département non trouvé');
    }
    return departement;
  }

  async update(
    pays: string,
    id: string,
    dto: MajDepartementDto,
  ): Promise<Departement> {
    const departement = await this.findOne(pays, id);

    if (dto.nom && dto.nom !== departement.nom) {
      const duplicate = await this.departementRepository.findOne({
        where: { nom: dto.nom, pays },
      });
      if (duplicate) {
        throw new ConflictException(
          `Un département nommé "${dto.nom}" existe déjà pour ce pays.`,
        );
      }
    }

    Object.assign(departement, dto);
    return this.departementRepository.save(departement);
  }

  async remove(pays: string, id: string): Promise<{ message: string }> {
    // Villes referencing this département are removed by the DB (FK ON DELETE
    // CASCADE); utilisateurs.departement_id is set NULL (ON DELETE SET NULL).
    const departement = await this.findOne(pays, id);
    await this.departementRepository.remove(departement);
    return { message: 'Département supprimé avec succès' };
  }

  // CSV columns: `nom,code` (code optional). An optional header row (first
  // token === 'nom') is skipped. Duplicates (nom+pays) are skipped, not errored.
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
        if (cols[0]?.toLowerCase() === 'nom') continue;
      }

      const nom = cols[0]?.trim();
      const code = cols[1]?.trim() || null;

      if (!nom) {
        summary.errors.push({ line: lineNo, reason: 'nom manquant' });
        continue;
      }

      const existing = await this.departementRepository.findOne({
        where: { nom, pays },
      });
      if (existing) {
        summary.skipped++;
        continue;
      }

      const departement = this.departementRepository.create({ nom, code, pays });
      await this.departementRepository.save(departement);
      summary.created++;
    }

    this.logger.log(
      `Import CSV départements (pays=${pays}): ${summary.created} créé(s), ${summary.skipped} ignoré(s), ${summary.errors.length} erreur(s)`,
    );
    return summary;
  }
}
