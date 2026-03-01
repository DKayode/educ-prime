import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceTypeDto, UpdateServiceTypeDto } from './dto/service-types.dto';

@Injectable()
export class ServiceTypesService {
    constructor(private prisma: PrismaService) { }

    async create(createServiceTypeDto: CreateServiceTypeDto) {
        const slug = createServiceTypeDto.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existing = await this.prisma.services_types.findUnique({
            where: { slug }
        });

        if (existing) {
            throw new ConflictException("Un type de service avec ce nom existe déjà.");
        }

        return this.prisma.services_types.create({
            data: { ...createServiceTypeDto, slug }
        });
    }

    async findAll() {
        return this.prisma.services_types.findMany({
            orderBy: { nom: 'asc' }
        });
    }

    async findOne(id: number) {
        const type = await this.prisma.services_types.findUnique({
            where: { id }
        });

        if (!type) {
            throw new NotFoundException(`Type de service #${id} introuvable`);
        }
        return type;
    }

    async update(id: number, updateServiceTypeDto: UpdateServiceTypeDto) {
        await this.findOne(id); // vérifie l'existence

        const dataToUpdate: any = { ...updateServiceTypeDto };

        if (updateServiceTypeDto.nom) {
            const slug = updateServiceTypeDto.nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const existing = await this.prisma.services_types.findFirst({
                where: {
                    slug,
                    NOT: { id }
                }
            });

            if (existing) {
                throw new ConflictException("Ce nom de service est déjà utilisé par un autre type.");
            }
            dataToUpdate.slug = slug;
        }

        return this.prisma.services_types.update({
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
            throw new ForbiddenException(`Impossible de supprimer ce type de service car il est actuellement assigné à ${relatedServicesCount} service(s).`);
        }

        await this.prisma.services_types.delete({
            where: { id }
        });

        return { message: "Type de service supprimé avec succès." };
    }
}
