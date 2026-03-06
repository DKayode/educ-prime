import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTypeDto, UpdateTypeDto } from './dto/type.dto';

@Injectable()
export class TypesService {
    constructor(private prisma: PrismaService) { }

    async create(createTypeDto: CreateTypeDto) {
        const slug = createTypeDto.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existing = await this.prisma.types.findUnique({
            where: { slug }
        });

        if (existing) {
            throw new ConflictException("Un type avec ce nom existe déjà.");
        }

        return this.prisma.types.create({
            data: { ...createTypeDto, slug }
        });
    }

    async findAll(options: { entite_type?: any, page?: number, limit?: number } = {}) {
        const { entite_type, page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (entite_type) {
            where.entite_type = entite_type;
        }

        const [data, total] = await Promise.all([
            this.prisma.types.findMany({
                where,
                skip,
                take: limit,
                orderBy: { nom: 'asc' }
            }),
            this.prisma.types.count({ where })
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
        const type = await this.prisma.types.findUnique({
            where: { id }
        });

        if (!type) {
            throw new NotFoundException(`Type #${id} introuvable`);
        }
        return type;
    }

    async update(id: number, updateTypeDto: UpdateTypeDto) {
        await this.findOne(id); // vérifie l'existence

        const dataToUpdate: any = { ...updateTypeDto };

        if (updateTypeDto.nom) {
            const slug = updateTypeDto.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const existing = await this.prisma.types.findFirst({
                where: {
                    slug,
                    NOT: { id }
                }
            });

            if (existing) {
                throw new ConflictException("Ce nom est déjà utilisé par un autre type.");
            }
            dataToUpdate.slug = slug;
        }

        return this.prisma.types.update({
            where: { id },
            data: dataToUpdate
        });
    }

    async remove(id: number) {
        await this.findOne(id);

        const relatedServicesCount = await this.prisma.services.count({
            where: { type_id: id }
        });

        if (relatedServicesCount > 0) {
            throw new ForbiddenException(`Impossible de supprimer ce type car il est actuellement assigné à ${relatedServicesCount} service(s).`);
        }

        await this.prisma.types.delete({
            where: { id }
        });

        return { message: "Type supprimé avec succès." };
    }
}
