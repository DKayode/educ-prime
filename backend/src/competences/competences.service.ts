import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Competence } from './entities/competence.entity';
import { CreateCompetenceDto, UpdateCompetenceDto } from './dto/competence.dto';

const slugify = (input: string) =>
    input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

@Injectable()
export class CompetencesService {
    constructor(
        @InjectRepository(Competence)
        private readonly competencesRepository: Repository<Competence>,
    ) { }

    async create(createCompetenceDto: CreateCompetenceDto) {
        const slug = slugify(createCompetenceDto.nom);

        const existing = await this.competencesRepository.findOne({ where: { slug } });
        if (existing) {
            throw new ConflictException('Cette compétence existe déjà.');
        }

        const competence = this.competencesRepository.create({ ...createCompetenceDto, slug });
        return this.competencesRepository.save(competence);
    }

    async findAll(options: { page?: number, limit?: number } = {}) {
        const { page = 1, limit = 10 } = options;
        const [data, total] = await this.competencesRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { nom: 'ASC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const competence = await this.competencesRepository.findOne({ where: { id } });
        if (!competence) {
            throw new NotFoundException(`Compétence #${id} introuvable`);
        }
        return competence;
    }

    async update(id: number, updateCompetenceDto: UpdateCompetenceDto) {
        const competence = await this.findOne(id);

        if (updateCompetenceDto.nom) {
            const slug = slugify(updateCompetenceDto.nom);
            const existing = await this.competencesRepository.findOne({ where: { slug, id: Not(id) } });
            if (existing) {
                throw new ConflictException('Ce nom de compétence est déjà utilisé.');
            }
            competence.slug = slug;
        }

        Object.assign(competence, updateCompetenceDto);
        return this.competencesRepository.save(competence);
    }

    async remove(id: number) {
        const competence = await this.findOne(id);
        await this.competencesRepository.remove(competence);
        return { message: 'Compétence supprimée avec succès.' };
    }
}
