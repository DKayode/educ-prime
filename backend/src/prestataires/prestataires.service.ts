import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrestataireDto, UpdatePrestataireDto } from './dto/prestataire.dto';
import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';

@Injectable()
export class PrestatairesService {
    constructor(
        private prisma: PrismaService,
        private fichiersService: FichiersService
    ) { }

    private readonly includeRelations = {
        competences: true,
        utilisateurs: {
            select: {
                id: true,
                uuid: true,
                nom: true,
                prenom: true,
                email: true
            }
        }
    };

    private formatPrestataire(prestataire: any) {
        if (!prestataire) return prestataire;
        const { utilisateur_id, utilisateurs, ...rest } = prestataire;
        return {
            ...rest,
            utilisateur: utilisateurs || null
        };
    }

    async create(createPrestataireDto: CreatePrestataireDto, utilisateurId: number) {
        // Check if user exists and is verified
        const user = await this.prisma.utilisateurs.findUnique({
            where: { id: utilisateurId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${utilisateurId} not found`);
        }

        if (!user.verifier) {
            throw new ForbiddenException("User email is not verified");
        }

        // Check if prestataire profile already exists for this user
        const existingProfile = await this.prisma.prestataires.findUnique({
            where: { utilisateur_id: utilisateurId },
        });

        if (existingProfile) {
            throw new BadRequestException('A prestataire profile already exists for this user');
        }

        const { utilisateur_id: _excluded, competences, ...prestataireData } = createPrestataireDto as any;

        // Verify if competences exist before connecting
        if (competences && competences.length > 0) {
            const existingCompetences = await this.prisma.competences.findMany({
                where: { slug: { in: competences } },
            });
            if (existingCompetences.length !== competences.length) {
                const existingSlugs = existingCompetences.map(c => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
        }

        // Create the profile
        const prestataire = await this.prisma.prestataires.create({
            data: {
                ...prestataireData,
                utilisateur_id: utilisateurId,
                competences: competences ? {
                    connect: competences.map(slug => ({ slug }))
                } : undefined
            },
            include: this.includeRelations
        });

        return this.formatPrestataire(prestataire);
    }

    async findAll() {
        const prestataires = await this.prisma.prestataires.findMany({
            include: this.includeRelations
        });
        return prestataires.map(p => this.formatPrestataire(p));
    }

    async findOne(id: number) {
        const prestataire = await this.prisma.prestataires.findUnique({
            where: { id },
            include: this.includeRelations
        });

        if (!prestataire) {
            throw new NotFoundException(`Prestataire with ID ${id} not found`);
        }

        return this.formatPrestataire(prestataire);
    }

    async findProfile(utilisateurId: number) {
        const profile = await this.prisma.prestataires.findUnique({
            where: { utilisateur_id: utilisateurId },
            include: this.includeRelations
        });

        if (!profile) {
            throw new NotFoundException(`Prestataire profile not found for user ID ${utilisateurId}`);
        }

        return this.formatPrestataire(profile);
    }

    async update(utilisateurId: number, updatePrestataireDto: UpdatePrestataireDto) {
        await this.findProfile(utilisateurId); // Ensure it exists

        const { utilisateur_id: _excluded, competences, ...prestataireData } = updatePrestataireDto as any;

        // Verify if competences exist before setting
        if (competences && competences.length > 0) {
            const existingCompetences = await this.prisma.competences.findMany({
                where: { slug: { in: competences } },
            });
            if (existingCompetences.length !== competences.length) {
                const existingSlugs = existingCompetences.map(c => c.slug);
                const missingSlugs = competences.filter((slug: string) => !existingSlugs.includes(slug));
                throw new BadRequestException(`Les compétences suivantes sont introuvables: ${missingSlugs.join(', ')}`);
            }
        }

        const updated = await this.prisma.prestataires.update({
            where: { utilisateur_id: utilisateurId },
            data: {
                ...prestataireData,
                competences: competences ? {
                    set: competences.map(slug => ({ slug }))
                } : undefined
            },
            include: this.includeRelations
        });

        return this.formatPrestataire(updated);
    }

    async remove(id: number) {
        await this.findOne(id); // Ensure it exists

        return this.prisma.prestataires.delete({
            where: { id },
        });
    }
    async uploadPhotoProfil(utilisateurId: number, file: any) {
        const prestataire = await this.prisma.prestataires.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire) throw new NotFoundException('Prestataire introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.PRESTATAIRE,
            entityId: prestataire.id,
        });

        return this.prisma.prestataires.update({
            where: { utilisateur_id: utilisateurId },
            data: { photo_profil: uploadResult.url }
        });
    }

    async downloadPhotoProfil(utilisateurId: number) {
        const prestataire = await this.prisma.prestataires.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire || !prestataire.photo_profil) {
            throw new NotFoundException('Aucune photo de profil (prestataire) disponible');
        }

        return this.fichiersService.downloadFile(prestataire.photo_profil);
    }

    async uploadPhotoIdentite(utilisateurId: number, file: any) {
        const prestataire = await this.prisma.prestataires.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire) throw new NotFoundException('Prestataire introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.PRESTATAIRE,
            entityId: prestataire.id,
        });

        return this.prisma.prestataires.update({
            where: { utilisateur_id: utilisateurId },
            data: { photo_identite: uploadResult.url }
        });
    }

    async downloadPhotoIdentite(utilisateurId: number) {
        const prestataire = await this.prisma.prestataires.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!prestataire || !prestataire.photo_identite) {
            throw new NotFoundException('Aucune photo d\'identité (prestataire) disponible');
        }

        return this.fichiersService.downloadFile(prestataire.photo_identite);
    }
}
