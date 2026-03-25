import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecruteurDto, UpdateRecruteurDto } from './dto/recruteur.dto';
import { FilterRecruteurDto } from './dto/filter-recruteur.dto';
import { services_status_enum } from '@prisma/client';
import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class RecruteursService {
    constructor(
        private prisma: PrismaService,
        private fichiersService: FichiersService,
        private mailService: MailService
    ) { }

    private readonly includeUtilisateur = {
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

    private formatRecruteur(recruteur: any) {
        if (!recruteur) return recruteur;
        const { utilisateur_id, utilisateurs, ...rest } = recruteur;
        return {
            ...rest,
            utilisateur: utilisateurs || null
        };
    }

    async create(createRecruteurDto: CreateRecruteurDto, utilisateurId: number) {
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

        // Check if recruteur profile already exists for this user
        const existingProfile = await this.prisma.recruteurs.findUnique({
            where: { utilisateur_id: utilisateurId },
        });

        if (existingProfile) {
            throw new BadRequestException('A recruteur profile already exists for this user');
        }

        const { utilisateur_id: _excluded, ...recruteurData } = createRecruteurDto as any;

        // Create the profile
        const recruteur = await this.prisma.recruteurs.create({
            data: {
                ...recruteurData,
                utilisateur_id: utilisateurId,
                status: services_status_enum.pending_approval,
            },
            include: this.includeUtilisateur
        });

        return this.formatRecruteur(recruteur);
    }

    async findAll() {
        const recruteurs = await this.prisma.recruteurs.findMany({
            where: {
                OR: [
                    { status: services_status_enum.active },
                    { status: services_status_enum.approved }
                ]
            },
            include: this.includeUtilisateur
        });
        return recruteurs.map(r => this.formatRecruteur(r));
    }

    async findAllAdmin(filterDto?: FilterRecruteurDto) {
        let orderBy: any = {};
        if (filterDto?.sort_by) {
            const field = filterDto.sort_by === 'date_creation' ? 'created_at' : filterDto.sort_by;
            orderBy = {
                [field]: filterDto.sort_order?.toLowerCase() || 'desc'
            };
        } else {
            orderBy = { created_at: 'desc' };
        }

        const recruteurs = await this.prisma.recruteurs.findMany({
            include: this.includeUtilisateur,
            orderBy
        });
        return recruteurs.map(r => this.formatRecruteur(r));
    }

    async findOne(id: number) {
        const recruteur = await this.prisma.recruteurs.findUnique({
            where: { id },
            include: this.includeUtilisateur
        });

        if (!recruteur) {
            throw new NotFoundException(`Recruteur with ID ${id} not found`);
        }

        return this.formatRecruteur(recruteur);
    }

    async findProfile(utilisateurId: number) {
        const profile = await this.prisma.recruteurs.findUnique({
            where: { utilisateur_id: utilisateurId },
            include: this.includeUtilisateur
        });

        if (!profile) {
            throw new NotFoundException(`Recruteur profile not found for user ID ${utilisateurId}`);
        }

        return this.formatRecruteur(profile);
    }

    async update(utilisateurId: number, updateRecruteurDto: UpdateRecruteurDto) {
        await this.findProfile(utilisateurId); // Ensure it exists

        const { utilisateur_id: _excluded, ...recruteurData } = updateRecruteurDto as any;

        const updated = await this.prisma.recruteurs.update({
            where: { utilisateur_id: utilisateurId },
            data: recruteurData,
            include: this.includeUtilisateur
        });

        return this.formatRecruteur(updated);
    }

    async updateStatus(id: number, status: services_status_enum) {
        const existingRecruteur = await this.findOne(id); // Ensure it exists

        const updated = await this.prisma.recruteurs.update({
            where: { id },
            data: { status },
            include: this.includeUtilisateur
        });

        // Send email notification if status changed
        if (existingRecruteur.status !== status && updated.utilisateurs?.email) {
            const userName = updated.utilisateurs.prenom && updated.utilisateurs.nom
                ? `${updated.utilisateurs.prenom} ${updated.utilisateurs.nom}`
                : (updated.utilisateurs.prenom || updated.utilisateurs.nom || 'Utilisateur');
            // We use setTimeout to not block the request while the email sends
            setTimeout(async () => {
                try {
                    await this.mailService.sendRecruteurStatusUpdateEmail(
                        updated.utilisateurs.email,
                        userName,
                        status
                    );
                } catch (error) {
                    console.error("Failed to send recruiter status update email asynchronously", error);
                }
            }, 0);
        }

        return this.formatRecruteur(updated);
    }

    async remove(id: number) {
        await this.findOne(id); // Ensure it exists

        return this.prisma.recruteurs.delete({
            where: { id },
        });
    }

    async uploadPhotoProfil(utilisateurId: number, file: any) {
        const recruteur = await this.prisma.recruteurs.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur) throw new NotFoundException('Recruteur introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.RECRUTEUR,
            entityId: recruteur.id,
        });

        const updated = await this.prisma.recruteurs.update({
            where: { utilisateur_id: utilisateurId },
            data: { photo_profil: uploadResult.url },
            include: this.includeUtilisateur
        });

        return this.formatRecruteur(updated);
    }

    async downloadPhotoProfil(utilisateurId: number) {
        const recruteur = await this.prisma.recruteurs.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur || !recruteur.photo_profil) {
            throw new NotFoundException('Aucune photo de profil (recruteur) disponible');
        }

        return this.fichiersService.downloadFile(recruteur.photo_profil);
    }

    async uploadPhotoIdentite(utilisateurId: number, file: any) {
        const recruteur = await this.prisma.recruteurs.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur) throw new NotFoundException('Recruteur introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.RECRUTEUR,
            entityId: recruteur.id,
        });

        const updated = await this.prisma.recruteurs.update({
            where: { utilisateur_id: utilisateurId },
            data: { photo_identite: uploadResult.url },
            include: this.includeUtilisateur
        });

        return this.formatRecruteur(updated);
    }

    async downloadPhotoIdentite(utilisateurId: number) {
        const recruteur = await this.prisma.recruteurs.findUnique({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur || !recruteur.photo_identite) {
            throw new NotFoundException('Aucune photo d\'identité (recruteur) disponible');
        }

        return this.fichiersService.downloadFile(recruteur.photo_identite);
    }
}
