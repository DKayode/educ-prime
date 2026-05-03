import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrestataireDto, UpdatePrestataireDto } from './dto/prestataire.dto';
import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';

import { Prestataire } from './entities/prestataire.entity';
import { Competence } from '../competences/entities/competence.entity';

@Injectable()
export class PrestatairesService {
    constructor(
        @InjectRepository(Prestataire)
        private prestatairesRepository: Repository<Prestataire>,
        @InjectRepository(Competence)
        private competencesRepository: Repository<Competence>,
        private prisma: PrismaService,
        private fichiersService: FichiersService
    ) { }

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

    private async formatPrestataire(prestataire: Prestataire) {
        if (!prestataire) return prestataire;
        
        let mappedUser = null;
        if (prestataire.utilisateur_id) {
            const user = await this.prisma.utilisateurs.findUnique({
                where: { id: prestataire.utilisateur_id }
            });
            mappedUser = this.formatUtilisateur(user);
        }

        return {
            ...prestataire,
            utilisateur: mappedUser
        };
    }

    private async formatManyPrestataires(prestataires: Prestataire[]) {
        if (!prestataires.length) return [];

        const userIds = [...new Set(prestataires.map(p => p.utilisateur_id))].filter(Boolean);
        const users = await this.prisma.utilisateurs.findMany({
            where: { id: { in: userIds } }
        });
        const userMap = new Map(users.map(u => [u.id, u]));

        return prestataires.map(prestataire => {
            const user = userMap.get(prestataire.utilisateur_id);
            return {
                ...prestataire,
                utilisateur: this.formatUtilisateur(user)
            };
        });
    }

    async create(createPrestataireDto: CreatePrestataireDto, utilisateurId: number) {
        const user = await this.prisma.utilisateurs.findUnique({
            where: { id: utilisateurId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${utilisateurId} not found`);
        }

        if (!user.verifier) {
            throw new ForbiddenException("User email is not verified");
        }

        const existingProfile = await this.prestatairesRepository.findOne({
            where: { utilisateur_id: utilisateurId },
        });

        if (existingProfile) {
            throw new BadRequestException('A prestataire profile already exists for this user');
        }

        const { utilisateur_id: _excluded, competences, ...prestataireData } = createPrestataireDto as any;

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

        const newPrestataire: Prestataire = this.prestatairesRepository.create({
            ...prestataireData,
            utilisateur_id: utilisateurId,
            competences: resolvedCompetences
        } as Partial<Prestataire>);

        const savedPrestataire = await this.prestatairesRepository.save(newPrestataire);

        const fullPrestataire = await this.prestatairesRepository.findOne({
            where: { id: savedPrestataire.id },
            relations: ['competences']
        });

        return this.formatPrestataire(fullPrestataire);
    }

    async findAll() {
        const prestataires = await this.prestatairesRepository.find({
            relations: ['competences']
        });
        return this.formatManyPrestataires(prestataires);
    }

    async findOne(id: number) {
        const prestataire = await this.prestatairesRepository.findOne({
            where: { id },
            relations: ['competences']
        });

        if (!prestataire) {
            throw new NotFoundException(`Prestataire with ID ${id} not found`);
        }

        return this.formatPrestataire(prestataire);
    }

    async findProfile(utilisateurId: number) {
        const profile = await this.prestatairesRepository.findOne({
            where: { utilisateur_id: utilisateurId },
            relations: ['competences']
        });

        if (!profile) {
            throw new NotFoundException(`Prestataire profile not found for user ID ${utilisateurId}`);
        }

        return this.formatPrestataire(profile);
    }

    async update(utilisateurId: number, updatePrestataireDto: UpdatePrestataireDto) {
        const profile = await this.prestatairesRepository.findOne({
            where: { utilisateur_id: utilisateurId },
            relations: ['competences']
        });

        if (!profile) {
            throw new NotFoundException(`Prestataire profile not found for user ID ${utilisateurId}`);
        }

        const { utilisateur_id: _excluded, competences, ...prestataireData } = updatePrestataireDto as any;

        Object.assign(profile, prestataireData);

        if (competences && competences.length > 0) {
            const resolvedCompetences = await this.competencesRepository.find({
                where: { slug: In(competences) },
            });
            if (resolvedCompetences.length !== competences.length) {
                const existingSlugs = resolvedCompetences.map(c => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
            profile.competences = resolvedCompetences;
        }

        const updated = await this.prestatairesRepository.save(profile);

        const fullPrestataire = await this.prestatairesRepository.findOne({
            where: { id: updated.id },
            relations: ['competences']
        });

        return this.formatPrestataire(fullPrestataire);
    }

    async remove(id: number) {
        const prestataire = await this.prestatairesRepository.findOne({ where: { id } });
        if (!prestataire) {
            throw new NotFoundException(`Prestataire with ID ${id} not found`);
        }
        return this.prestatairesRepository.remove(prestataire);
    }

    async uploadPhotoProfil(utilisateurId: number, file: any) {
        const prestataire = await this.prestatairesRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire) throw new NotFoundException('Prestataire introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.PRESTATAIRE,
            entityId: prestataire.id,
        });

        prestataire.photo_profil = uploadResult.url;
        await this.prestatairesRepository.save(prestataire);

        return prestataire;
    }

    async downloadPhotoProfil(utilisateurId: number) {
        const prestataire = await this.prestatairesRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire || !prestataire.photo_profil) {
            throw new NotFoundException('Aucune photo de profil (prestataire) disponible');
        }

        return this.fichiersService.downloadFile(prestataire.photo_profil);
    }

    async uploadPhotoIdentite(utilisateurId: number, file: any) {
        const prestataire = await this.prestatairesRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire) throw new NotFoundException('Prestataire introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.PRESTATAIRE,
            entityId: prestataire.id,
        });

        prestataire.photo_identite = uploadResult.url;
        await this.prestatairesRepository.save(prestataire);

        return prestataire;
    }

    async downloadPhotoIdentite(utilisateurId: number) {
        const prestataire = await this.prestatairesRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire || !prestataire.photo_identite) {
            throw new NotFoundException('Aucune photo d\'identité (prestataire) disponible');
        }

        return this.fichiersService.downloadFile(prestataire.photo_identite);
    }
}
