import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { ExamenNational } from './entities/examen-national.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { Serie } from '../series/entities/serie.entity';
import { MatiereFiliereExamen } from '../matieres-filieres-examen/entities/matiere-filiere-examen.entity';
import { CreateExamenNationalDto } from './dto/create-examen-national.dto';
import { UpdateExamenNationalDto } from './dto/update-examen-national.dto';
import { FilterExamenNationalDto } from './dto/filter-examen-national.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class ExamensNationauxService {
    private readonly logger = new Logger(ExamensNationauxService.name);

    constructor(private readonly resolver: DataSourceResolver) { }

    private get repo(): Repository<ExamenNational> { return this.resolver.getRepository(ExamenNational); }
    private get typeRepo(): Repository<TypeExamen> { return this.resolver.getRepository(TypeExamen); }
    private get serieRepo(): Repository<Serie> { return this.resolver.getRepository(Serie); }
    private get mfeRepo(): Repository<MatiereFiliereExamen> { return this.resolver.getRepository(MatiereFiliereExamen); }

    private async fetchType(id: number): Promise<TypeExamen> {
        const row = await this.typeRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Type d'examen ${id} introuvable`);
        return row;
    }
    private async fetchMatiere(id: number): Promise<MatiereFiliereExamen> {
        const row = await this.mfeRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Matière/filière ${id} introuvable`);
        return row;
    }
    private async fetchSerie(id: number): Promise<Serie> {
        const row = await this.serieRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Série ${id} introuvable`);
        return row;
    }

    // Composes the display titre: "<type> - <série?> - <matière> - <année>".
    async composeTitre(typeId: number, matiereId: number, serieId?: number | null, annee?: number | null): Promise<string> {
        const type = await this.fetchType(typeId);
        const matiere = await this.fetchMatiere(matiereId);
        const serie = serieId != null ? await this.fetchSerie(serieId) : null;
        return [type.nom, serie?.nom, matiere.nom, annee != null ? String(annee) : null]
            .filter(Boolean)
            .join(' - ');
    }

    async create(pays: string, dto: CreateExamenNationalDto) {
        this.logger.log(`Création examen national (pays=${pays}, type ${dto.type_examen_id}, matière ${dto.matiere_filiere_examen_id})`);
        const titre = await this.composeTitre(dto.type_examen_id, dto.matiere_filiere_examen_id, dto.serie_id, dto.annee);
        const row = this.repo.create({ ...dto, pays, titre });
        const saved = await this.repo.save(row);
        this.logger.log(`Examen national créé: ${saved.titre} (ID ${saved.id}, pays ${saved.pays})`);
        return saved;
    }

    async findAll(pays: string, filterDto: FilterExamenNationalDto): Promise<PaginationResponse<ExamenNational>> {
        const { page = 1, limit = 10, search, type_examen, serie, matiere_filiere_examen, annee } = filterDto;
        const qb = this.repo.createQueryBuilder('examen')
            .leftJoinAndSelect('examen.type_examen', 'type_examen')
            .leftJoinAndSelect('examen.serie', 'serie')
            .leftJoinAndSelect('examen.matiere_filiere_examen', 'matiere_filiere_examen')
            .where('examen.pays = :pays', { pays });

        if (type_examen) qb.andWhere('examen.type_examen_id = :type', { type: type_examen });
        if (serie) qb.andWhere('examen.serie_id = :serie', { serie });
        if (matiere_filiere_examen) qb.andWhere('examen.matiere_filiere_examen_id = :mfe', { mfe: matiere_filiere_examen });
        if (annee) qb.andWhere('examen.annee = :annee', { annee });
        if (search) qb.andWhere('unaccent(examen.titre) ILIKE unaccent(:search)', { search: `%${search}%` });

        qb.orderBy('examen.annee', 'DESC').addOrderBy('examen.titre', 'ASC')
            .skip((page - 1) * limit).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getAnnees(pays: string): Promise<number[]> {
        const rows = await this.repo.createQueryBuilder('examen')
            .select('DISTINCT examen.annee', 'annee')
            .where('examen.pays = :pays', { pays })
            .andWhere('examen.annee IS NOT NULL')
            .orderBy('examen.annee', 'DESC')
            .getRawMany();
        return rows.map(r => Number(r.annee));
    }

    async findOne(id: number) {
        const row = await this.repo.findOne({ where: { id }, relations: ['type_examen', 'serie', 'matiere_filiere_examen'] });
        if (!row) throw new NotFoundException('Examen national non trouvé');
        return row;
    }

    async update(id: number, dto: UpdateExamenNationalDto) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row) throw new NotFoundException('Examen national non trouvé');

        const classifierChanged = dto.type_examen_id !== undefined || dto.serie_id !== undefined
            || dto.matiere_filiere_examen_id !== undefined || dto.annee !== undefined;
        Object.assign(row, dto);
        if (classifierChanged) {
            if (row.type_examen_id == null || row.matiere_filiere_examen_id == null || row.annee == null) {
                throw new BadRequestException('type_examen_id, matiere_filiere_examen_id et annee sont requis');
            }
            row.titre = await this.composeTitre(row.type_examen_id, row.matiere_filiere_examen_id, row.serie_id, row.annee);
        }
        const saved = await this.repo.save(row);
        this.logger.log(`Examen national mis à jour: ${saved.titre} (ID ${id})`);
        return saved;
    }

    async remove(id: number) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row) throw new NotFoundException('Examen national non trouvé');
        await this.repo.remove(row);
        return { message: 'Examen national supprimé avec succès' };
    }
}
