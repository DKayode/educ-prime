import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { ExamenNational } from './entities/examen-national.entity';
import { TypeExamen } from '../types-examen/entities/type-examen.entity';
import { Serie } from '../series/entities/serie.entity';
import { MatiereExamen } from '../matieres-examen/entities/matiere-examen.entity';
import { FiliereExamen } from '../filieres-examen/entities/filiere-examen.entity';
import { CreateExamenNationalDto } from './dto/create-examen-national.dto';
import { UpdateExamenNationalDto } from './dto/update-examen-national.dto';
import { FilterExamenNationalDto } from './dto/filter-examen-national.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { KessiahService, KessiahExtractionState, kessiahNationalKey } from '../kessiah/kessiah.service';

/** État de lecture joint à un examen, ou le constat qu'il n'y en a pas. */
type EtatDeLecture = KessiahExtractionState | { statut: 'absent' };

@Injectable()
export class ExamensNationauxService {
    private readonly logger = new Logger(ExamensNationauxService.name);

    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly kessiah: KessiahService,
    ) { }

    /**
     * Joint à chaque examen ce que Ketsia en sait déjà — même champ, mêmes
     * trois valeurs que sur les épreuves (voir EpreuvesService).
     *
     * La clé interrogée est PRÉFIXÉE : l'examen 10 se lit sous `national:10`,
     * et demander « 10 » rapporterait l'état de l'épreuve 10, qui est un tout
     * autre document.
     */
    private async avecEtatDeLecture<T extends { id: number }>(
        examens: T[],
    ): Promise<Array<T & { lecture: EtatDeLecture | null }>> {
        const etats = await this.kessiah.getStatesOrUnknown(
            examens.map((e) => kessiahNationalKey(e.id)),
        );
        return examens.map((examen) => ({
            ...examen,
            lecture: etats === null
                ? null
                : etats[kessiahNationalKey(examen.id)] ?? { statut: 'absent' as const },
        }));
    }

    private get repo(): Repository<ExamenNational> { return this.resolver.getRepository(ExamenNational); }
    private get typeRepo(): Repository<TypeExamen> { return this.resolver.getRepository(TypeExamen); }
    private get serieRepo(): Repository<Serie> { return this.resolver.getRepository(Serie); }
    private get matiereRepo(): Repository<MatiereExamen> { return this.resolver.getRepository(MatiereExamen); }
    private get filiereRepo(): Repository<FiliereExamen> { return this.resolver.getRepository(FiliereExamen); }

    private async fetchType(id: number): Promise<TypeExamen> {
        const row = await this.typeRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Type d'examen ${id} introuvable`);
        return row;
    }
    private async fetchSerie(id: number): Promise<Serie> {
        const row = await this.serieRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Série ${id} introuvable`);
        return row;
    }
    private async fetchMatiere(id: number): Promise<MatiereExamen> {
        const row = await this.matiereRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Matière ${id} introuvable`);
        return row;
    }
    private async fetchFiliere(id: number): Promise<FiliereExamen> {
        const row = await this.filiereRepo.findOne({ where: { id } });
        if (!row) throw new NotFoundException(`Filière ${id} introuvable`);
        return row;
    }

    // Intitulé : "<type> - <série?> - <filière?> - <matière?> - <année>".
    // Matière et filière sont optionnelles mais au moins l'une des deux est là.
    async composeTitre(
        typeId: number,
        opts: { serieId?: number | null; filiereId?: number | null; matiereId?: number | null; annee?: number | null },
    ): Promise<string> {
        const type = await this.fetchType(typeId);
        const serie = opts.serieId != null ? await this.fetchSerie(opts.serieId) : null;
        const filiere = opts.filiereId != null ? await this.fetchFiliere(opts.filiereId) : null;
        const matiere = opts.matiereId != null ? await this.fetchMatiere(opts.matiereId) : null;
        return [type.nom, serie?.nom, filiere?.nom, matiere?.nom, opts.annee != null ? String(opts.annee) : null]
            .filter(Boolean)
            .join(' - ');
    }

    private assertMatiereOrFiliere(matiereId?: number | null, filiereId?: number | null) {
        if (matiereId == null && filiereId == null) {
            throw new BadRequestException('Au moins une matière ou une filière est requise.');
        }
    }

    async create(pays: string, dto: CreateExamenNationalDto) {
        this.assertMatiereOrFiliere(dto.matiere_examen_id, dto.filiere_examen_id);
        this.logger.log(`Création examen national (pays=${pays}, type ${dto.type_examen_id}, matière ${dto.matiere_examen_id ?? '-'}, filière ${dto.filiere_examen_id ?? '-'})`);
        const titre = await this.composeTitre(dto.type_examen_id, {
            serieId: dto.serie_id, filiereId: dto.filiere_examen_id, matiereId: dto.matiere_examen_id, annee: dto.annee,
        });
        const row = this.repo.create({ ...dto, pays, titre });
        const saved = await this.repo.save(row);
        this.logger.log(`Examen national créé: ${saved.titre} (ID ${saved.id}, pays ${saved.pays})`);
        return saved;
    }

    async findAll(pays: string, filterDto: FilterExamenNationalDto): Promise<PaginationResponse<ExamenNational>> {
        const { page = 1, limit = 10, search, type_examen, serie, matiere_examen, filiere_examen, annee } = filterDto;
        const qb = this.repo.createQueryBuilder('examen')
            .leftJoinAndSelect('examen.type_examen', 'type_examen')
            .leftJoinAndSelect('examen.serie', 'serie')
            .leftJoinAndSelect('examen.matiere_examen', 'matiere_examen')
            .leftJoinAndSelect('examen.filiere_examen', 'filiere_examen')
            .where('examen.pays = :pays', { pays });

        if (type_examen) qb.andWhere('examen.type_examen_id = :type', { type: type_examen });
        if (serie) qb.andWhere('examen.serie_id = :serie', { serie });
        if (matiere_examen) qb.andWhere('examen.matiere_examen_id = :mat', { mat: matiere_examen });
        if (filiere_examen) qb.andWhere('examen.filiere_examen_id = :fil', { fil: filiere_examen });
        if (annee) qb.andWhere('examen.annee = :annee', { annee });
        // Chaque mot séparément, tous exigés — et non la phrase entière.
        //
        // Le titre est composé côté serveur sous la forme « BAC - C -
        // Physique-Chimie - 2025 » : un ILIKE sur « BAC C 2025 » n'y trouve
        // rien, puisque cette suite de caractères n'y figure pas. La recherche
        // ne répondait donc qu'aux mots isolés, ce qui la rendait inutilisable
        // dès qu'on nomme un examen comme on le nomme à l'oral — et rend
        // muette l'assistante, qui interroge justement en langage naturel.
        if (search) {
            const mots = search.trim().split(/\s+/).filter(Boolean);
            mots.forEach((mot, i) => {
                qb.andWhere(`unaccent(examen.titre) ILIKE unaccent(:mot${i})`, {
                    [`mot${i}`]: `%${mot}%`,
                });
            });
        }

        qb.orderBy('examen.annee', 'DESC').addOrderBy('examen.titre', 'ASC')
            .skip((page - 1) * limit).take(limit);

        const [data, total] = await qb.getManyAndCount();
        return {
            data: await this.avecEtatDeLecture(data),
            total, page, limit, totalPages: Math.ceil(total / limit),
        };
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
        const row = await this.repo.findOne({ where: { id }, relations: ['type_examen', 'serie', 'matiere_examen', 'filiere_examen'] });
        if (!row) throw new NotFoundException('Examen national non trouvé');
        const [avecLecture] = await this.avecEtatDeLecture([row]);
        return avecLecture;
    }

    async update(id: number, dto: UpdateExamenNationalDto) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row) throw new NotFoundException('Examen national non trouvé');

        const classifierChanged = dto.type_examen_id !== undefined || dto.serie_id !== undefined
            || dto.matiere_examen_id !== undefined || dto.filiere_examen_id !== undefined || dto.annee !== undefined;
        Object.assign(row, dto);
        if (classifierChanged) {
            if (row.type_examen_id == null || row.annee == null) {
                throw new BadRequestException('type_examen_id et annee sont requis');
            }
            this.assertMatiereOrFiliere(row.matiere_examen_id, row.filiere_examen_id);
            row.titre = await this.composeTitre(row.type_examen_id, {
                serieId: row.serie_id, filiereId: row.filiere_examen_id, matiereId: row.matiere_examen_id, annee: row.annee,
            });
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
