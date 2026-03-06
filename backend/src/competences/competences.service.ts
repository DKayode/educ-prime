import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetenceDto, UpdateCompetenceDto } from './dto/competence.dto';

@Injectable()
export class CompetencesService {
    constructor(private prisma: PrismaService) { }

    async create(createCompetenceDto: CreateCompetenceDto) {
        const slug = createCompetenceDto.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existing = await this.prisma.competences.findUnique({
            where: { slug }
        });

        if (existing) {
            throw new ConflictException("Cette compétence existe déjà.");
        }

        return this.prisma.competences.create({
            data: { ...createCompetenceDto, slug }
        });
    }

    async findAll(options: { page?: number, limit?: number } = {}) {
        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.competences.findMany({
                skip,
                take: limit,
                orderBy: { nom: 'asc' }
            }),
            this.prisma.competences.count()
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findOne(id: number) {
        const competence = await this.prisma.competences.findUnique({
            where: { id }
        });

        if (!competence) {
            throw new NotFoundException(`Compétence #${id} introuvable`);
        }
        return competence;
    }

    async update(id: number, updateCompetenceDto: UpdateCompetenceDto) {
        await this.findOne(id);

        const dataToUpdate: any = { ...updateCompetenceDto };

        if (updateCompetenceDto.nom) {
            const slug = updateCompetenceDto.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const existing = await this.prisma.competences.findFirst({
                where: {
                    slug,
                    NOT: { id }
                }
            });

            if (existing) {
                throw new ConflictException("Ce nom de compétence est déjà utilisé.");
            }
            dataToUpdate.slug = slug;
        }

        return this.prisma.competences.update({
            where: { id },
            data: dataToUpdate
        });
    }

    async remove(id: number) {
        await this.findOne(id);

        await this.prisma.competences.delete({
            where: { id }
        });

        return { message: "Compétence supprimée avec succès." };
    }
}
