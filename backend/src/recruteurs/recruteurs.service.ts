import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { Recruteur } from './entities/recruteur.entity';
import { Utilisateur } from '../utilisateurs/entities/utilisateur.entity';
import { ServiceStatusEnum } from '../common/enums/service-status.enum';
import { CreateRecruteurDto, UpdateRecruteurDto } from './dto/recruteur.dto';
import { FilterRecruteurDto } from './dto/filter-recruteur.dto';
import { FichiersService } from '../fichiers/fichiers.service';
import { TypeFichier } from '../fichiers/entities/fichier.entity';
import { MailService } from '../mail/mail.service';
import { DataSourceResolver } from '../config/data-source-resolver.service';

@Injectable()
export class RecruteursService {
    constructor(
        private readonly resolver: DataSourceResolver,
        private readonly fichiersService: FichiersService,
        private readonly mailService: MailService,
    ) { }

    private get recruteursRepository(): Repository<Recruteur> { return this.resolver.getRepository(Recruteur); }
    private get utilisateursRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }

    private formatRecruteur(recruteur: Recruteur | null) {
        if (!recruteur) return recruteur;
        const { utilisateur_id, utilisateur, ...rest } = recruteur;
        return {
            ...rest,
            utilisateur: utilisateur ? {
                id: utilisateur.id,
                uuid: utilisateur.uuid,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom,
                email: utilisateur.email,
                profil: utilisateur.profil_photo_path || null,
            } : null,
        };
    }

    async create(pays: string, createRecruteurDto: CreateRecruteurDto, utilisateurId: number) {
        const user = await this.utilisateursRepository.findOne({ where: { id: utilisateurId } });
        if (!user) {
            throw new NotFoundException(`User with ID ${utilisateurId} not found`);
        }
        if (!user.verifier) {
            throw new ForbiddenException('User email is not verified');
        }

        const existingProfile = await this.recruteursRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (existingProfile) {
            throw new BadRequestException('A recruteur profile already exists for this user');
        }

        const { utilisateur_id: _excluded, ...recruteurData } = createRecruteurDto as any;

        const recruteur: Recruteur = this.recruteursRepository.create({
            ...recruteurData,
            pays,
            utilisateur_id: utilisateurId,
            status: ServiceStatusEnum.PENDING_APPROVAL,
        } as Partial<Recruteur>);
        const saved = await this.recruteursRepository.save(recruteur);

        const fullRecruteur = await this.recruteursRepository.findOne({
            where: { id: saved.id },
            relations: ['utilisateur'],
        });
        return this.formatRecruteur(fullRecruteur);
    }

    async findAll(pays: string) {
        const recruteurs = await this.recruteursRepository.find({
            where: { pays, status: In([ServiceStatusEnum.ACTIVE, ServiceStatusEnum.APPROVED]) },
            relations: ['utilisateur'],
        });
        return recruteurs.map(r => this.formatRecruteur(r));
    }

    async findAllAdmin(pays: string, filterDto?: FilterRecruteurDto) {
        const order: Record<string, 'ASC' | 'DESC'> = {};
        const direction = filterDto?.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        if (filterDto?.sort_by) {
            const field = filterDto.sort_by === 'date_creation' ? 'created_at' : filterDto.sort_by;
            order[field] = direction;
        } else {
            order.created_at = 'DESC';
        }

        const recruteurs = await this.recruteursRepository.find({
            where: { pays },
            relations: ['utilisateur'],
            order,
        });
        return recruteurs.map(r => this.formatRecruteur(r));
    }

    async findOne(id: number) {
        const recruteur = await this.recruteursRepository.findOne({
            where: { id },
            relations: ['utilisateur'],
        });
        if (!recruteur) {
            throw new NotFoundException(`Recruteur with ID ${id} not found`);
        }
        return this.formatRecruteur(recruteur);
    }

    async findProfile(utilisateurId: number) {
        const profile = await this.recruteursRepository.findOne({
            where: { utilisateur_id: utilisateurId },
            relations: ['utilisateur'],
        });
        if (!profile) {
            throw new NotFoundException(`Recruteur profile not found for user ID ${utilisateurId}`);
        }
        return this.formatRecruteur(profile);
    }

    async update(utilisateurId: number, updateRecruteurDto: UpdateRecruteurDto) {
        const profile = await this.recruteursRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!profile) {
            throw new NotFoundException(`Recruteur profile not found for user ID ${utilisateurId}`);
        }

        const { utilisateur_id: _excluded, ...recruteurData } = updateRecruteurDto as any;
        Object.assign(profile, recruteurData);
        await this.recruteursRepository.save(profile);

        const updated = await this.recruteursRepository.findOne({
            where: { utilisateur_id: utilisateurId },
            relations: ['utilisateur'],
        });
        return this.formatRecruteur(updated);
    }

    async updateStatus(id: number, status: ServiceStatusEnum) {
        const existingRecruteur = await this.recruteursRepository.findOne({
            where: { id },
            relations: ['utilisateur'],
        });
        if (!existingRecruteur) {
            throw new NotFoundException(`Recruteur with ID ${id} not found`);
        }

        const previousStatus = existingRecruteur.status;
        existingRecruteur.status = status;
        await this.recruteursRepository.save(existingRecruteur);

        const updated = await this.recruteursRepository.findOne({
            where: { id },
            relations: ['utilisateur'],
        });

        if (previousStatus !== status && updated.utilisateur?.email) {
            const userName = updated.utilisateur.prenom && updated.utilisateur.nom
                ? `${updated.utilisateur.prenom} ${updated.utilisateur.nom}`
                : (updated.utilisateur.prenom || updated.utilisateur.nom || 'Utilisateur');
            setTimeout(async () => {
                try {
                    await this.mailService.sendRecruteurStatusUpdateEmail(
                        updated.utilisateur.email,
                        userName,
                        status,
                    );
                } catch (error) {
                    console.error('Failed to send recruiter status update email asynchronously', error);
                }
            }, 0);
        }

        return this.formatRecruteur(updated);
    }

    async remove(id: number) {
        const recruteur = await this.recruteursRepository.findOne({ where: { id } });
        if (!recruteur) {
            throw new NotFoundException(`Recruteur with ID ${id} not found`);
        }
        return this.recruteursRepository.remove(recruteur);
    }

    async uploadPhotoProfil(utilisateurId: number, file: any) {
        const recruteur = await this.recruteursRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur) throw new NotFoundException('Recruteur introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.RECRUTEUR,
            entityId: recruteur.id,
        });

        recruteur.photo_profil = uploadResult.url;
        await this.recruteursRepository.save(recruteur);

        const updated = await this.recruteursRepository.findOne({
            where: { utilisateur_id: utilisateurId },
            relations: ['utilisateur'],
        });
        return this.formatRecruteur(updated);
    }

    async downloadPhotoProfil(utilisateurId: number) {
        const recruteur = await this.recruteursRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur || !recruteur.photo_profil) {
            throw new NotFoundException('Aucune photo de profil (recruteur) disponible');
        }
        return this.fichiersService.downloadFile(recruteur.photo_profil);
    }

    async uploadPhotoIdentite(utilisateurId: number, file: any) {
        const recruteur = await this.recruteursRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur) throw new NotFoundException('Recruteur introuvable');

        const uploadResult = await this.fichiersService.uploadFile(file, utilisateurId, {
            type: TypeFichier.RECRUTEUR,
            entityId: recruteur.id,
        });

        recruteur.photo_identite = uploadResult.url;
        await this.recruteursRepository.save(recruteur);

        const updated = await this.recruteursRepository.findOne({
            where: { utilisateur_id: utilisateurId },
            relations: ['utilisateur'],
        });
        return this.formatRecruteur(updated);
    }

    async downloadPhotoIdentite(utilisateurId: number) {
        const recruteur = await this.recruteursRepository.findOne({ where: { utilisateur_id: utilisateurId } });
        if (!recruteur || !recruteur.photo_identite) {
            throw new NotFoundException('Aucune photo d\'identité (recruteur) disponible');
        }
        return this.fichiersService.downloadFile(recruteur.photo_identite);
    }
}
