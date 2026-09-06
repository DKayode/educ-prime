import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { FichiersService } from '../fichiers/fichiers.service';
import { Repository, Like, FindOptionsWhere, Brackets } from 'typeorm';
import { Epreuve, EpreuveType, normalizeEpreuveType } from './entities/epreuve.entity';
import { Matiere } from '../matieres/entities/matiere.entity';
import { DataSourceResolver } from '../config/data-source-resolver.service';
import { CreerEpreuveDto } from './dto/creer-epreuve.dto';
import { MajEpreuveDto } from './dto/maj-epreuve.dto';
import { FilterEpreuveDto } from './dto/filter-epreuve.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/pagination-response.interface';
import { EpreuveResponseDto } from './dto/epreuve-response.dto';
import { professeurPublic } from './professeur-public.util';
import { KessiahService, KessiahExtractionState } from '../kessiah/kessiah.service';
import { EntitlementService, Feature } from '../abonnements/entitlement.service';
import { QuotaService } from '../abonnements/quota.service';
import { FeatureQuota } from '../abonnements/entities/quota-consommation.entity';

/** État de lecture joint à une épreuve, ou le constat qu'il n'y en a pas. */
type EtatDeLecture = KessiahExtractionState | { statut: 'absent' };

@Injectable()
export class EpreuvesService {
  private readonly logger = new Logger(EpreuvesService.name);

  constructor(
    private readonly resolver: DataSourceResolver,
    private readonly fichiersService: FichiersService,
    private readonly kessiah: KessiahService,
    private readonly entitlement: EntitlementService,
    private readonly quotas: QuotaService,
  ) { }

  /**
   * Joint à chaque épreuve ce que Kessiah en sait déjà.
   *
   * Sans ce champ, l'app ne peut que demander une lecture à l'aveugle à chaque
   * ouverture, et le backend répond « déjà lue » — un aller-retour pour rien,
   * répété sur toute la navigation. Avec lui, elle ne déclenche que sur les
   * épreuves jamais lues, et peut afficher l'état sans rien demander de plus.
   *
   * Trois valeurs, pas deux — c'est ce qui rend le champ actionnable :
   *
   * - un état complet : Ketsia l'a lue, ou est en train ;
   * - `statut: 'absent'` : elle ne l'a jamais lue, il y a une lecture à
   *   demander ;
   * - `null` : Kessiah n'a pas répondu, on ne sait rien. L'app ne déclenche
   *   rien dans ce cas — une lecture demandée à un service muet échouerait, et
   *   traiter ce silence comme « jamais lue » rejouerait des transcriptions
   *   déjà faites. Le catalogue, lui, s'affiche normalement.
   */
  private async avecEtatDeLecture<T extends { id: number }>(
    epreuves: T[],
  ): Promise<Array<T & { lecture: EtatDeLecture | null }>> {
    const etats = await this.kessiah.getStatesOrUnknown(epreuves.map((e) => e.id));
    return epreuves.map((epreuve) => ({
      ...epreuve,
      lecture: etats === null
        ? null
        : etats[String(epreuve.id)] ?? { statut: 'absent' as const },
    }));
  }

  /**
   * Ajoute `verrouille` et `deja_consultee` à une page de résultats.
   *
   * Deux requêtes par appel HTTP au maximum, jamais une par ligne.
   * `deja_consultee` est indispensable : sans lui, l'application ferait croire
   * qu'ouvrir une ressource déjà vue coûte une nouvelle unité de quota.
   */
  private async avecEtatDeDroit<T extends { id: number }>(
    lignes: T[],
    utilisateurId?: number,
    role?: string,
    pays = 'benin',
  ): Promise<Array<T & { verrouille: boolean; deja_consultee: boolean }>> {
    const decision = utilisateurId
      ? await this.entitlement.check(utilisateurId, Feature.EPREUVE_VIEW, role, pays)
      : { allowed: false, reason: 'SUBSCRIPTION_REQUIRED' as const };

    // Le quota n'est interrogé que s'il s'applique vraiment. Un abonné, un
    // admin ou un quota désactivé n'ont aucune ressource « déjà consultée » qui
    // les concerne — et `decision.quota` est absent dans ces trois cas.
    const consommees = decision.quota
      ? await this.quotas.ressourcesConsommees(utilisateurId, FeatureQuota.RESOURCE_VIEW, 'epreuve', pays)
      : new Set<number>();

    return lignes.map((ligne) => ({
      ...ligne,
      // Une ressource déjà consommée reste ouverte même quota épuisé.
      verrouille: !decision.allowed && !consommees.has(ligne.id),
      deja_consultee: consommees.has(ligne.id),
    }));
  }

  private get epreuvesRepository(): Repository<Epreuve> {
    return this.resolver.getRepository(Epreuve);
  }

  private get matieresRepository(): Repository<Matiere> {
    return this.resolver.getRepository(Matiere);
  }

  // Single source of truth for the client-facing épreuve shape (sanitized
  // professeur + matiere chain). Used by findAll / findOne.
  private toEpreuveResponse(epreuve: Epreuve) {
    return {
      id: epreuve.id,
      uuid: epreuve.uuid,
      titre: epreuve.titre,
      url: epreuve.url,
      file_path: epreuve.file_path,
      file_extension: epreuve.file_extension,
      duree_minutes: epreuve.duree_minutes,
      date_creation: epreuve.date_creation,
      date_publication: epreuve.date_publication,
      nombre_pages: epreuve.nombre_pages,
      nombre_telechargements: epreuve.nombre_telechargements,
      type: epreuve.type,
      annee: epreuve.annee,
      section: epreuve.section,
      professeur: professeurPublic(epreuve.professeur),
      matiere: {
        id: epreuve.matiere.id,
        nom: epreuve.matiere.nom,
        description: epreuve.matiere.description,
        niveau_etude: {
          id: epreuve.matiere.niveau_etude.id,
          nom: epreuve.matiere.niveau_etude.nom,
          duree_mois: epreuve.matiere.niveau_etude.duree_mois,
          filiere: {
            id: epreuve.matiere.niveau_etude.filiere.id,
            nom: epreuve.matiere.niveau_etude.filiere.nom,
            etablissement: epreuve.matiere.niveau_etude.filiere.etablissement,
          },
        },
      },
    };
  }

  async create(creerEpreuveDto: CreerEpreuveDto, professeurId: number) {
    this.logger.log(`Création d'une épreuve: ${creerEpreuveDto.titre} par professeur ID: ${professeurId}`);
    // pays is DERIVED from the parent Matiere (cascading up to the Etablissement),
    // never defaulted to 'benin' nor taken from the request country.
    const matiere = await this.matieresRepository.findOne({
      where: { id: creerEpreuveDto.matiere_id },
    });
    if (!matiere) {
      this.logger.warn(`Matière ID ${creerEpreuveDto.matiere_id} introuvable`);
      throw new NotFoundException('Matière non trouvée');
    }
    const newEpreuve = new Epreuve();
    newEpreuve.titre = creerEpreuveDto.titre;
    // Row may exist before the PDF: the file is uploaded afterwards via
    // /files/epreuves/:uuid/file, which backfills url. Seed empty until then.
    newEpreuve.url = creerEpreuveDto.url ?? '';
    // duree_minutes is NOT NULL with no DB default; 0 = unspecified (consistent
    // with nombre_pages), so a minimal create doesn't violate the constraint.
    newEpreuve.duree_minutes = creerEpreuveDto.duree_minutes ?? 0;
    newEpreuve.matiere_id = creerEpreuveDto.matiere_id;
    newEpreuve.professeur_id = professeurId;
    newEpreuve.date_publication = creerEpreuveDto.date_publication;
    newEpreuve.nombre_pages = creerEpreuveDto.nombre_pages;
    // Seuls EXAMENS / EXAMENS NATIONAUX sont valides — tout le reste → EXAMENS.
    newEpreuve.type = normalizeEpreuveType(creerEpreuveDto.type);
    newEpreuve.annee = creerEpreuveDto.annee;
    if (creerEpreuveDto.section !== undefined) {
      newEpreuve.section = creerEpreuveDto.section;
    }
    newEpreuve.pays = matiere.pays;
    const saved = await this.epreuvesRepository.save(newEpreuve);
    this.logger.log(`Épreuve créée: ${saved.titre} (ID: ${saved.id}, Matière: ${saved.matiere_id}, pays: ${saved.pays})`);
    return saved;
  }

  async findAll(pays: string, filterDto: FilterEpreuveDto, utilisateurId?: number, role?: string): Promise<PaginationResponse<any>> {
    const { page = 1, limit = 10, search, type, matiere } = filterDto;
    this.logger.log(`Récupération des épreuves (pays=${pays}) - Page: ${page}, Limite: ${limit}, Search: ${search}, Type: ${type}, Matière: ${matiere}`);

    const queryBuilder = this.epreuvesRepository.createQueryBuilder('epreuve')
      .leftJoinAndSelect('epreuve.matiere', 'matiere')
      .leftJoinAndSelect('matiere.niveau_etude', 'niveau_etude')
      .leftJoinAndSelect('niveau_etude.filiere', 'filiere')
      .leftJoinAndSelect('filiere.etablissement', 'etablissement')
      .leftJoinAndSelect('epreuve.professeur', 'professeur')
      .where('epreuve.pays = :pays', { pays })
      .orderBy('epreuve.date_creation', filterDto.sort_order || 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('epreuve.type = :type', { type });
    }

    if (matiere) {
      queryBuilder.andWhere('matiere.nom = :matiere', { matiere });
    }

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('unaccent(epreuve.titre) ILIKE unaccent(:search)', { search: `%${search}%` })
            .orWhere('unaccent(matiere.nom) ILIKE unaccent(:search)', { search: `%${search}%` });
        }),
      );
    }


    const [epreuves, total] = await queryBuilder.getManyAndCount();


    this.logger.log(`${epreuves.length} épreuve(s) trouvée(s) sur ${total} total`);

    const avecLecture = await this.avecEtatDeLecture(
      epreuves.map(epreuve => this.toEpreuveResponse(epreuve)),
    );
    const data = await this.avecEtatDeDroit(avecLecture, utilisateurId, role, pays);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, utilisateurId?: number, role?: string, pays = 'benin') {
    this.logger.log(`Recherche de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['matiere', 'matiere.niveau_etude', 'matiere.niveau_etude.filiere', 'matiere.niveau_etude.filiere.etablissement', 'professeur'],
    });

    if (!epreuve) {
      this.logger.warn(`Épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    this.logger.log(`Épreuve trouvée: ${epreuve.titre} (ID: ${id})`);

    // Même champ que dans la liste : la fiche de détails est ouverte sans
    // repasser par la liste (lien direct, notification), et doit pouvoir
    // décider seule s'il y a une lecture à demander.
    const [avecLecture] = await this.avecEtatDeLecture([
      this.toEpreuveResponse(epreuve),
    ]);
    const [avecDroit] = await this.avecEtatDeDroit([avecLecture], utilisateurId, role, pays);
    return avecDroit;
  }

  async findOneForDownload(id: string): Promise<{ url: string; titre: string }> {
    this.logger.log(`Recherche de l'épreuve pour téléchargement - ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!epreuve) {
      this.logger.warn(`Épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    if (!epreuve.url) {
      this.logger.warn(`Épreuve ID ${id} n'a pas de fichier associé`);
      throw new BadRequestException('Cette épreuve n\'a pas de fichier associé');
    }

    this.logger.log(`Épreuve trouvée pour téléchargement: ${epreuve.titre} (ID: ${id})`);

    // Increment download count
    epreuve.nombre_telechargements = (epreuve.nombre_telechargements || 0) + 1;
    await this.epreuvesRepository.save(epreuve);

    return { url: epreuve.url, titre: epreuve.titre };
  }

  async update(id: string, majEpreuveDto: MajEpreuveDto) {
    this.logger.log(`Mise à jour de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
      relations: ['professeur'],
    });

    if (!epreuve) {
      this.logger.warn(`Mise à jour échouée: épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }

    Object.assign(epreuve, majEpreuveDto);
    // Contrainte type: seuls EXAMENS / EXAMENS NATIONAUX — coercition si fourni.
    if (majEpreuveDto.type !== undefined) epreuve.type = normalizeEpreuveType(majEpreuveDto.type);

    // Parent changed → re-derive pays from the new Matiere.
    if (majEpreuveDto.matiere_id) {
      const matiere = await this.matieresRepository.findOne({
        where: { id: majEpreuveDto.matiere_id },
      });
      if (!matiere) {
        this.logger.warn(`Matière ID ${majEpreuveDto.matiere_id} introuvable`);
        throw new NotFoundException('Matière non trouvée');
      }
      epreuve.pays = matiere.pays;
    }

    const updated = await this.epreuvesRepository.save(epreuve);
    this.logger.log(`Épreuve mise à jour: ${updated.titre} (ID: ${id})`);
    return updated;
  }

  async remove(id: string) {
    this.logger.log(`Suppression de l'épreuve ID: ${id}`);
    const epreuve = await this.epreuvesRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!epreuve) {
      this.logger.warn(`Suppression échouée: épreuve ID ${id} introuvable`);
      throw new NotFoundException('Épreuve non trouvée');
    }


    // Delete associated file from storage
    if (epreuve.url) {
      try {
        await this.fichiersService.deleteFile(epreuve.url);
      } catch (error) {
        this.logger.warn(`Failed to delete file for epreuve ${id}: ${error.message}`);
      }
    }

    await this.epreuvesRepository.remove(epreuve);
    this.logger.log(`Épreuve supprimée: ${epreuve.titre} (ID: ${id})`);
    return { message: 'Épreuve supprimée avec succès' };
  }

}