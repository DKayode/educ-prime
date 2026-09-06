import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CampagneCode } from './entities/campagne-code.entity';
import { CodeUtilisation } from './entities/code-utilisation.entity';
import { Code, TypeCode } from './entities/code.entity';
import { CodeValidationService } from './code-validation.service';
import { CreateCodeDto } from './dto/create-code.dto';
import { UpdateCodeDto } from './dto/update-code.dto';
import { GenererCampagneDto } from './dto/generer-campagne.dto';
import { FilterCodesDto } from './dto/filter-codes.dto';

/**
 * Alphabet sans caractères ambigus.
 *
 * Ces codes se dictent à l'oral et se tapent sur mobile : `0`/`O` et `1`/`I`/`L`
 * produisent des saisies fausses que l'utilisateur ne peut pas diagnostiquer.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class CodesService {
  private readonly logger = new Logger(CodesService.name);

  constructor(
    @InjectRepository(Code) private readonly codes: Repository<Code>,
    @InjectRepository(CampagneCode) private readonly campagnes: Repository<CampagneCode>,
    @InjectRepository(CodeUtilisation) private readonly utilisations: Repository<CodeUtilisation>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(pays: string, filtre: FilterCodesDto) {
    const page = filtre.page ?? 1;
    const limit = filtre.limit ?? 20;

    const qb = this.codes
      .createQueryBuilder('code')
      .leftJoin('code.proprietaire', 'proprietaire')
      .addSelect(['proprietaire.id', 'proprietaire.nom', 'proprietaire.prenom', 'proprietaire.email'])
      .leftJoinAndSelect('code.campagne', 'campagne')
      .where('code.pays = :pays', { pays });

    // Les codes de parrainage sont générés à l'inscription : les mêler au
    // catalogue promo noierait ce dernier sous des dizaines de milliers de lignes.
    if (filtre.type) qb.andWhere('code.type = :type', { type: filtre.type });
    else qb.andWhere('code.type <> :parrainage', { parrainage: TypeCode.PARRAINAGE });

    if (filtre.campagne_uuid) qb.andWhere('campagne.uuid = :cu', { cu: filtre.campagne_uuid });
    if (filtre.est_actif !== undefined) qb.andWhere('code.est_actif = :a', { a: filtre.est_actif });
    if (filtre.search) qb.andWhere('(upper(code.code) LIKE :q OR code.libelle ILIKE :q2)', {
      q: `%${filtre.search.toUpperCase()}%`,
      q2: `%${filtre.search}%`,
    });

    const [data, total] = await qb
      .orderBy('code.date_creation', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByUuid(uuid: string): Promise<Code> {
    const code = await this.codes.findOne({ where: { uuid }, relations: ['campagne', 'proprietaire'] });
    if (!code) throw new NotFoundException('Code introuvable');
    return code;
  }

  async create(pays: string, dto: CreateCodeDto, adminId?: number): Promise<Code> {
    const code = CodeValidationService.normaliser(dto.code);
    if (await this.existe(code)) throw new ConflictException(`Le code ${code} existe déjà`);

    const cree = this.codes.create({
      ...dto,
      code,
      pays,
      cree_par: adminId ?? null,
      plans_eligibles: dto.plans_eligibles?.length ? dto.plans_eligibles : null,
    });
    const sauvegarde = await this.codes.save(cree);
    this.logger.log(`Code ${sauvegarde.code} créé (${sauvegarde.type}, ${pays})`);
    return sauvegarde;
  }

  async update(uuid: string, dto: UpdateCodeDto): Promise<Code> {
    const code = await this.findByUuid(uuid);
    if (dto.code && CodeValidationService.normaliser(dto.code) !== code.code.toUpperCase()) {
      const nouveau = CodeValidationService.normaliser(dto.code);
      if (await this.existe(nouveau)) throw new ConflictException(`Le code ${nouveau} existe déjà`);
      code.code = nouveau;
    }
    const { code: _ignore, ...reste } = dto;
    Object.assign(code, reste);
    if (dto.plans_eligibles !== undefined) {
      code.plans_eligibles = dto.plans_eligibles?.length ? dto.plans_eligibles : null;
    }
    return this.codes.save(code);
  }

  /** Désactivation logique : un code utilisé garde son historique. */
  async desactiver(uuid: string): Promise<Code> {
    const code = await this.findByUuid(uuid);
    code.est_actif = false;
    return this.codes.save(code);
  }

  async utilisationsDuCode(uuid: string) {
    const code = await this.findByUuid(uuid);
    return this.dataSource.query(
      `SELECT cu.id, cu.montant_remise, cu.date_creation,
              u.uuid AS utilisateur_uuid, u.nom, u.prenom, u.email,
              a.uuid AS abonnement_uuid, a.statut
         FROM codes_utilisations cu
         JOIN utilisateurs u ON u.id = cu.utilisateur_id
    LEFT JOIN abonnements a  ON a.id = cu.abonnement_id
        WHERE cu.code_id = $1
     ORDER BY cu.date_creation DESC
        LIMIT 200`,
      [code.id],
    );
  }

  // ── Campagnes ────────────────────────────────────────────────────────────

  async campagnesList(pays: string) {
    const campagnes = await this.campagnes.find({ where: { pays }, order: { date_creation: 'DESC' } });
    if (!campagnes.length) return [];

    // Une requête d'agrégat pour toutes les campagnes, pas une par ligne.
    const stats = await this.dataSource.query(
      `SELECT c.campagne_id,
              COUNT(*)::int                                   AS total,
              COUNT(*) FILTER (WHERE u.n > 0)::int            AS utilises
         FROM codes c
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS n FROM codes_utilisations cu WHERE cu.code_id = c.id) u ON true
        WHERE c.campagne_id = ANY($1)
     GROUP BY c.campagne_id`,
      [campagnes.map((c) => c.id)],
    );
    const parId = new Map<number, any>(stats.map((s: any) => [Number(s.campagne_id), s]));

    return campagnes.map((c) => ({
      ...c,
      codes_generes: Number(parId.get(c.id)?.total ?? 0),
      codes_utilises: Number(parId.get(c.id)?.utilises ?? 0),
    }));
  }

  /**
   * Génère n codes uniques à usage unique — le second cas de l'issue.
   *
   * Les codes sont insérés en UN seul INSERT, pas n requêtes : une campagne de
   * 5 000 codes ne doit pas ouvrir 5 000 allers-retours. Les collisions sont
   * absorbées par `ON CONFLICT DO NOTHING`, et on complète jusqu'au compte.
   */
  async genererCampagne(pays: string, dto: GenererCampagneDto, adminId?: number) {
    const prefixe = dto.prefixe ? CodeValidationService.normaliser(dto.prefixe) : '';
    const campagne = await this.campagnes.save(
      this.campagnes.create({
        pays,
        nom: dto.nom,
        description: dto.description ?? null,
        prefixe: prefixe || null,
        nombre_codes: dto.nombre_codes,
        remise_type: dto.remise_type ?? null,
        remise_valeur: dto.remise_valeur ?? null,
        date_debut: dto.date_debut ? new Date(dto.date_debut) : null,
        date_fin: dto.date_fin ? new Date(dto.date_fin) : null,
        cree_par: adminId ?? null,
      }),
    );

    let inseres = 0;
    for (let tentative = 0; tentative < 10 && inseres < dto.nombre_codes; tentative++) {
      const manquants = dto.nombre_codes - inseres;
      const candidats = Array.from({ length: manquants }, () => this.genererCode(prefixe));
      const valeurs = candidats.map((c) => `('${pays}','${c}','REDUCTION',${campagne.id},1,1,${dto.remise_type ? `'${dto.remise_type}'` : 'NULL'},${dto.remise_valeur ?? 'NULL'},${dto.date_debut ? `'${dto.date_debut}'` : 'NULL'},${dto.date_fin ? `'${dto.date_fin}'` : 'NULL'},${adminId ?? 'NULL'})`).join(',');
      const { rowCount } = await this.dataSource.query(
        `INSERT INTO codes (pays, code, type, campagne_id, usage_max_total, usage_max_par_utilisateur,
                            remise_type, remise_valeur, date_debut, date_fin, cree_par)
         VALUES ${valeurs}
         ON CONFLICT DO NOTHING
         RETURNING id`,
      ).then((r: any[]) => ({ rowCount: r.length }));
      inseres += rowCount;
    }

    if (inseres < dto.nombre_codes) {
      this.logger.warn(
        `Campagne ${campagne.nom} : ${inseres}/${dto.nombre_codes} codes générés (collisions répétées)`,
      );
    }
    this.logger.log(`Campagne ${campagne.nom} : ${inseres} code(s) généré(s)`);
    return { campagne, codes_generes: inseres, demandes: dto.nombre_codes };
  }

  /** Export CSV d'une campagne — les codes doivent sortir pour être distribués. */
  async exporterCampagne(uuid: string): Promise<string> {
    const campagne = await this.campagnes.findOne({ where: { uuid } });
    if (!campagne) throw new NotFoundException('Campagne introuvable');

    const lignes = await this.dataSource.query(
      `SELECT c.code,
              (SELECT COUNT(*)::int FROM codes_utilisations cu WHERE cu.code_id = c.id) AS utilise
         FROM codes c WHERE c.campagne_id = $1 ORDER BY c.id`,
      [campagne.id],
    );
    const entete = 'code;utilise';
    return [entete, ...lignes.map((l: any) => `${l.code};${Number(l.utilise) > 0 ? 'oui' : 'non'}`)].join('\n');
  }

  private genererCode(prefixe: string): string {
    const corps = Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    return prefixe ? `${prefixe}-${corps}` : corps;
  }

  private async existe(code: string): Promise<boolean> {
    const [r] = await this.codes.query(`SELECT 1 FROM codes WHERE upper(code) = $1 LIMIT 1`, [code]);
    return !!r;
  }

  /**
   * Enregistre le code de parrainage d'un nouveau compte dans le registre.
   *
   * Best-effort : l'inscription ne doit pas échouer parce que le registre est
   * indisponible. La résolution à l'achat retombe alors sur
   * `utilisateurs.mon_code_parrainage`.
   */
  async enregistrerCodeParrainage(utilisateurId: number, code: string, pays = 'benin'): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO codes (pays, code, type, proprietaire_id, usage_max_total, usage_max_par_utilisateur, est_actif)
         VALUES ($1, $2, 'PARRAINAGE', $3, NULL, 1, true)
         ON CONFLICT DO NOTHING`,
        [pays, CodeValidationService.normaliser(code), utilisateurId],
      );
    } catch (err) {
      this.logger.warn(`Enregistrement du code de parrainage ${code} échoué : ${err?.message ?? err}`);
    }
  }
}
