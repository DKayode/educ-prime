import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, In, ILike } from 'typeorm';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CreateOffreDto, UpdateOffreDto } from './dto/offre.dto';

import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';
import { MailService } from '../mail/mail.service';

import { Offre, ServiceStatusEnum } from './entities/offre.entity';
import { Type } from '../types/entities/type.entity';
import { Competence } from '../competences/entities/competence.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { Avis } from '../avis/entities/avis.entity';
import { EntiteType } from '../common/enums/entite-type.enum';

export interface OffreFilterDto {
    type?: string;
    prixMin?: number;
    prixMax?: number;
    search?: string;
    page?: number;
    limit?: number;
}

export interface AvisStats {
    moyenne: number;
    total: number;
}

@Injectable()
export class OffresService {
    constructor(
        private readonly resolver: DataSourceResolver,
        private fichiersService: FichiersService,
        private mailService: MailService
    ) { }

    private get offresRepository(): Repository<Offre> { return this.resolver.getRepository(Offre); }
    private get typesRepository(): Repository<Type> { return this.resolver.getRepository(Type); }
    private get competencesRepository(): Repository<Competence> { return this.resolver.getRepository(Competence); }
    private get utilisateursRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }
    private get avisRepository(): Repository<Avis> { return this.resolver.getRepository(Avis); }

    private async getAvisStats(offreId: number): Promise<AvisStats> {
        const row = await this.avisRepository.createQueryBuilder('avis')
            .select('AVG(avis.note)', 'avg_note')
            .addSelect('COUNT(avis.id)', 'total')
            .where('avis.avisable_type = :type', { type: EntiteType.OFFRES })
            .andWhere('avis.avisable_id = :id', { id: offreId })
            .getRawOne<{ avg_note: string | null, total: string }>();

        return {
            moyenne: row?.avg_note ? parseFloat(Number(row.avg_note).toFixed(1)) : 0,
            total: parseInt(row?.total ?? '0', 10),
        };
    }

    private async getManyAvisStats(offreIds: number[]): Promise<Map<number, AvisStats>> {
        if (!offreIds.length) return new Map();
        const rows = await this.avisRepository.createQueryBuilder('avis')
            .select('avis.avisable_id', 'avisable_id')
            .addSelect('AVG(avis.note)', 'avg_note')
            .addSelect('COUNT(avis.id)', 'total')
            .where('avis.avisable_type = :type', { type: EntiteType.OFFRES })
            .andWhere('avis.avisable_id IN (:...ids)', { ids: offreIds })
            .groupBy('avis.avisable_id')
            .getRawMany<{ avisable_id: string | number, avg_note: string | null, total: string }>();

        return new Map(rows.map(r => [Number(r.avisable_id), {
            moyenne: r.avg_note ? parseFloat(Number(r.avg_note).toFixed(1)) : 0,
            total: parseInt(r.total, 10),
        }]));
    }

    private formatUtilisateur(user: any) {
        if (!user) return null;
        return {
            id: user.id,
            uuid: user.uuid,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email
        };
    }

    private buildRecruteur(userWithRecruteur: any) {
        if (!userWithRecruteur) return { mappedUser: null, recruteur: null };
        const mappedUser = this.formatUtilisateur(userWithRecruteur);
        let recruteur = null;
        if (userWithRecruteur.recruteur) {
            const { utilisateur_id, ...recruteurRest } = userWithRecruteur.recruteur;
            recruteur = {
                ...recruteurRest,
                uuid: userWithRecruteur.uuid,
                utilisateur: mappedUser,
            };
        }
        return { mappedUser, recruteur };
    }

    private async formatOffre(offre: Offre) {
        if (!offre) return null;
        const avis = await this.getAvisStats(offre.id);

        let mappedUser = null;
        let recruteur = null;
        if (offre.utilisateur_id) {
            const userWithRecruteur = await this.utilisateursRepository.findOne({
                where: { id: offre.utilisateur_id },
                relations: ['recruteur'],
            });
            ({ mappedUser, recruteur } = this.buildRecruteur(userWithRecruteur));
        }

        return { ...offre, utilisateur: mappedUser, recruteur, avis };
    }

    private async formatManyOffres(offres: Offre[]) {
        if (!offres.length) return [];
        const offreIds = offres.map(o => o.id);
        const avisMap = await this.getManyAvisStats(offreIds);

        const userIds = [...new Set(offres.map(o => o.utilisateur_id))].filter(Boolean);
        const users = userIds.length
            ? await this.utilisateursRepository.find({
                where: { id: In(userIds) },
                relations: ['recruteur'],
            })
            : [];
        const userMap = new Map(users.map(u => [u.id, u]));

        return offres.map(offre => {
            const { mappedUser, recruteur } = this.buildRecruteur(userMap.get(offre.utilisateur_id));
            return {
                ...offre,
                utilisateur: mappedUser,
                recruteur,
                avis: avisMap.get(offre.id) || { moyenne: 0, total: 0 },
            };
        });
    }

    async create(userId: number, createOffreDto: CreateOffreDto) {
        const user = await this.utilisateursRepository.findOne({
            where: { id: userId },
            relations: ['recruteur'],
        });

        if (!user || !user.verifier) {
            throw new ForbiddenException("Vous devez vérifier votre adresse email pour poster une offre.");
        }

        if (!user.recruteur) {
            throw new ForbiddenException("Seuls les recruteurs peuvent publier des offres.");
        }

        let typeId = createOffreDto.type_id;

        if (!typeId) {
            if (createOffreDto.type) {
                const typeEntity = await this.typesRepository.findOne({
                    where: { slug: createOffreDto.type },
                });
                if (!typeEntity) {
                    throw new NotFoundException(`Le type spécifié (${createOffreDto.type}) est introuvable.`);
                }
                typeId = typeEntity.id;
            } else {
                throw new BadRequestException('Vous devez spécifier soit "type_id" soit "type".');
            }
        }

        const { competences, type, type_id, ...offreData } = createOffreDto as any;

        let resolvedCompetences: Competence[] = [];
        if (competences && competences.length > 0) {
            resolvedCompetences = await this.competencesRepository.find({
                where: { slug: In(competences) },
            });
            if (resolvedCompetences.length !== competences.length) {
                const existingSlugs = resolvedCompetences.map(c => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
        }

        const newOffre: Offre = this.offresRepository.create({
            ...offreData,
            type_id: typeId,
            utilisateur_id: userId,
            competences: resolvedCompetences
        } as Partial<Offre>);

        const savedOffre = await this.offresRepository.save(newOffre);

        // Fetch back with relations
        const fullOffre = await this.offresRepository.findOne({
            where: { id: savedOffre.id },
            relations: ['types', 'competences']
        });

        return this.formatOffre(fullOffre);
    }

    async findAll(filters: OffreFilterDto) {
        const { type, prixMin, prixMax, search, page = 1, limit = 10 } = filters;

        const queryBuilder = this.offresRepository.createQueryBuilder('offre')
            .leftJoinAndSelect('offre.type', 'type')
            .leftJoinAndSelect('offre.competences', 'competences')
            .where('offre.status IN (:...statuses)', { statuses: [ServiceStatusEnum.APPROVED, 'active'] });

        if (type) {
            queryBuilder.andWhere('type.slug = :type', { type });
        }

        if (prixMin !== undefined) {
            queryBuilder.andWhere('offre.prix >= :prixMin', { prixMin });
        }
        
        if (prixMax !== undefined) {
            queryBuilder.andWhere('offre.prix <= :prixMax', { prixMax });
        }

        if (search) {
            queryBuilder.andWhere('(offre.titre ILIKE :search OR offre.description ILIKE :search)', { search: `%${search}%` });
        }

        queryBuilder.orderBy('offre.created_at', 'DESC');
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data: await this.formatManyOffres(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllByUser(userId: number, pagination: { page: number, limit: number }) {
        const { page = 1, limit = 10 } = pagination;

        const [data, total] = await this.offresRepository.findAndCount({
            where: { utilisateur_id: userId },
            relations: ['type', 'competences'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        });

        return {
            data: await this.formatManyOffres(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllAdmin(pagination: { page: number, limit: number }) {
        const { page = 1, limit = 10 } = pagination;

        const [data, total] = await this.offresRepository.findAndCount({
            relations: ['type', 'competences'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        });

        return {
            data: await this.formatManyOffres(data),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const offre = await this.offresRepository.findOne({
            where: { id },
            relations: ['type', 'competences']
        });

        if (!offre) {
            throw new NotFoundException(`Offre #${id} introuvable`);
        }

        return this.formatOffre(offre);
    }

    async update(id: number, userId: number, updateOffreDto: UpdateOffreDto) {
        const offre = await this.offresRepository.findOne({
            where: { id },
            relations: ['competences']
        });

        if (!offre) {
            throw new NotFoundException(`Offre #${id} introuvable`);
        }

        if (offre.utilisateur_id !== Number(userId)) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette offre.");
        }

        let typeId = updateOffreDto.type_id;

        if (!typeId && updateOffreDto.type) {
            const typeEntity = await this.typesRepository.findOne({
                where: { slug: updateOffreDto.type },
            });
            if (!typeEntity) {
                throw new NotFoundException(`Le type spécifié (${updateOffreDto.type}) est introuvable.`);
            }
            typeId = typeEntity.id;
        }

        const { competences, type, type_id, ...offreData } = updateOffreDto as any;

        // Remove status explicitly
        if ('status' in offreData) {
            delete offreData.status;
        }

        Object.assign(offre, offreData);
        
        if (typeId) {
            offre.type_id = typeId;
        }

        if (competences && competences.length > 0) {
            const resolvedCompetences = await this.competencesRepository.find({
                where: { slug: In(competences) },
            });
            if (resolvedCompetences.length !== competences.length) {
                const existingSlugs = resolvedCompetences.map(c => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
            offre.competences = resolvedCompetences;
        }

        const updatedOffre = await this.offresRepository.save(offre);

        // Fetch fully populated
        const fullOffre = await this.offresRepository.findOne({
            where: { id: updatedOffre.id },
            relations: ['type', 'competences']
        });

        return this.formatOffre(fullOffre);
    }

    async updateStatus(id: number, status: ServiceStatusEnum) {
        const offre = await this.offresRepository.findOne({ where: { id } });
        if (!offre) throw new NotFoundException(`Offre #${id} introuvable`);
        
        const oldStatus = offre.status;
        offre.status = status as any;
        
        await this.offresRepository.save(offre);
        
        const fullOffre = await this.offresRepository.findOne({
            where: { id },
            relations: ['type', 'competences']
        });

        // Send email notification if status changed
        if (oldStatus !== status) {
            const user = await this.utilisateursRepository.findOne({
                where: { id: offre.utilisateur_id }
            });
            
            if (user && user.email) {
                const userName = user.prenom && user.nom
                    ? `${user.prenom} ${user.nom}`
                    : (user.prenom || user.nom || 'Utilisateur');
                const serviceTitle = offre.titre || 'Offre';

                setTimeout(async () => {
                    try {
                        await this.mailService.sendServiceStatusUpdateEmail(
                            user.email,
                            userName,
                            serviceTitle,
                            status,
                            'offre'
                        );
                    } catch (error) {
                        console.error("Failed to send offer status update email asynchronously", error);
                    }
                }, 0);
            }
        }

        return this.formatOffre(fullOffre);
    }

    async remove(id: number, userId: number, userRole?: string) {
        const offre = await this.offresRepository.findOne({ where: { id } });

        if (!offre) {
            throw new NotFoundException(`Offre #${id} introuvable`);
        }

        if (offre.utilisateur_id !== Number(userId) && userRole !== 'admin') {
            throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer cette offre.");
        }

        await this.offresRepository.remove(offre);

        return { message: "Offre supprimée avec succès." };
    }

    async uploadImageCouverture(offreId: number, userId: number, file: Express.Multer.File) {
        const offre = await this.offresRepository.findOne({ where: { id: offreId } });

        if (!offre) throw new NotFoundException();

        if (offre.utilisateur_id !== Number(userId)) {
            throw new ForbiddenException("Vous n'êtes pas autorisé à modifier l'image de cette offre.");
        }

        const uploadData = {
            type: TypeFichier.OFFRE,
            entityId: offreId,
        };

        const result = await this.fichiersService.uploadFile(file, userId, uploadData as any);

        offre.image_couverture = result.url;
        await this.offresRepository.save(offre);

        return { message: 'Image de couverture mise à jour avec succès', url: result.url };
    }

    async downloadImageCouverture(offreId: number) {
        const offre = await this.offresRepository.findOne({ where: { id: offreId } });

        if (!offre || !offre.image_couverture) {
            throw new NotFoundException('Image de couverture non trouvée pour cette offre');
        }

        return this.fichiersService.downloadFile(offre.image_couverture);
    }
}
