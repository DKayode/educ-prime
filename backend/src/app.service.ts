import { Injectable } from '@nestjs/common';
import { ObjectLiteral, Repository, Not, SelectQueryBuilder } from 'typeorm';
import { Utilisateur, RoleType } from './utilisateurs/entities/utilisateur.entity';
import { Etablissement } from './etablissements/entities/etablissement.entity';
import { Filiere } from './filieres/entities/filiere.entity';
import { Matiere } from './matieres/entities/matiere.entity';
import { Epreuve } from './epreuves/entities/epreuve.entity';
import { Publicite } from './publicites/entities/publicite.entity';
import { Evenement } from './evenements/entities/evenement.entity';
import { Opportunite } from './opportunites/entities/opportunite.entity';
import { Concours } from './concours/entities/concours.entity';
import { ContactsProfessionnel } from './contacts-professionnels/entities/contacts-professionnel.entity';
import { Parcour } from './parcours/entities/parcour.entity';
import { Category } from './categories/entities/category.entity';
import { DataSourceResolver } from './config/data-source-resolver.service';

@Injectable()
export class AppService {
  constructor(
    private readonly resolver: DataSourceResolver,
  ) { }

  private get utilisateursRepository(): Repository<Utilisateur> { return this.resolver.getRepository(Utilisateur); }
  private get etablissementsRepository(): Repository<Etablissement> { return this.resolver.getRepository(Etablissement); }
  private get filieresRepository(): Repository<Filiere> { return this.resolver.getRepository(Filiere); }
  private get matieresRepository(): Repository<Matiere> { return this.resolver.getRepository(Matiere); }
  private get epreuvesRepository(): Repository<Epreuve> { return this.resolver.getRepository(Epreuve); }
  private get publicitesRepository(): Repository<Publicite> { return this.resolver.getRepository(Publicite); }
  private get evenementsRepository(): Repository<Evenement> { return this.resolver.getRepository(Evenement); }
  private get opportunitesRepository(): Repository<Opportunite> { return this.resolver.getRepository(Opportunite); }
  private get concoursRepository(): Repository<Concours> { return this.resolver.getRepository(Concours); }
  private get contactsProfessionnelsRepository(): Repository<ContactsProfessionnel> { return this.resolver.getRepository(ContactsProfessionnel); }
  private get parcoursRepository(): Repository<Parcour> { return this.resolver.getRepository(Parcour); }
  private get categoriesRepository(): Repository<Category> { return this.resolver.getRepository(Category); }

  /**
   * Dashboard aggregates.
   *
   * - `pays = '<slug>'` → scoped to that one country (historic behaviour,
   *   byte-identical to before this change).
   * - `pays = undefined` → aggregate across ALL configured countries, and
   *   additionally return a `par_pays` breakdown so the dashboard can show
   *   per-country splits.
   */
  async getStats(pays?: string): Promise<StatsResponse> {
    if (pays !== undefined) {
      return this.getScopedStats(pays);
    }
    return this.getAllCountriesStats();
  }

  /** Per-country path — unchanged from the original implementation. */
  private async getScopedStats(pays: string): Promise<StatsTotals> {
    const [
      usersCount,
      etablissementsCount,
      filieresCount,
      matieresCount,
      epreuvesCount,
      publicitesCount,
      evenementsCount,
      opportunitesCount,
      concoursCount,
      contactsProfessionnelsCount,
      parcoursCount,
      categoriesCount,
    ] = await Promise.all([
      this.utilisateursRepository.count({ where: { role: Not(RoleType.ADMIN), pays } }),
      this.etablissementsRepository.count({ where: { pays } }),
      this.filieresRepository.count({ where: { pays } }),
      this.matieresRepository.count({ where: { pays } }),
      this.epreuvesRepository.count({ where: { pays } }),
      this.publicitesRepository.count({ where: { pays } }),
      this.evenementsRepository.count({ where: { pays } }),
      this.opportunitesRepository.count({ where: { pays } }),
      this.concoursRepository.count({ where: { pays } }),
      this.contactsProfessionnelsRepository.count({ where: { pays } }),
      this.parcoursRepository.count({ where: { pays } }),
      this.categoriesRepository.count({ where: { pays } })

    ]);

    return {
      usersCount,
      etablissementsCount,
      filieresCount,
      matieresCount,
      epreuvesCount: epreuvesCount + concoursCount,
      publicitesCount,
      evenementsCount,
      opportunitesCount,
      concoursCount,
      contactsProfessionnelsCount,
      parcoursCount,
      categoriesCount
    };
  }

  /**
   * ALL-countries path. Each aggregate is grouped by `pays` in a single
   * query; the grand totals are the sums of those groups, so we never query
   * twice. Returns the flat totals PLUS a `par_pays` array of the same shape.
   */
  private async getAllCountriesStats(): Promise<StatsTotals & { par_pays: CountryStats[] }> {
    const [
      users,
      etablissements,
      filieres,
      matieres,
      epreuves,
      publicites,
      evenements,
      opportunites,
      concours,
      contactsProfessionnels,
      parcours,
      categories,
    ] = await Promise.all([
      this.groupByCountry(this.utilisateursRepository, qb =>
        qb.where('e.role != :role', { role: RoleType.ADMIN })),
      this.groupByCountry(this.etablissementsRepository),
      this.groupByCountry(this.filieresRepository),
      this.groupByCountry(this.matieresRepository),
      this.groupByCountry(this.epreuvesRepository),
      this.groupByCountry(this.publicitesRepository),
      this.groupByCountry(this.evenementsRepository),
      this.groupByCountry(this.opportunitesRepository),
      this.groupByCountry(this.concoursRepository),
      this.groupByCountry(this.contactsProfessionnelsRepository),
      this.groupByCountry(this.parcoursRepository),
      this.groupByCountry(this.categoriesRepository),
    ]);

    const maps: EntityMaps = {
      users, etablissements, filieres, matieres, epreuves, publicites,
      evenements, opportunites, concours, contactsProfessionnels, parcours, categories,
    };

    // Every country that appears in any aggregate.
    const countries = new Set<string>();
    for (const m of Object.values(maps)) {
      for (const c of m.keys()) countries.add(c);
    }

    const par_pays: CountryStats[] = [...countries]
      .sort()
      .map(pays => ({ pays, ...this.assembleTotals(maps, pays) }));

    return { ...this.assembleTotals(maps, null), par_pays };
  }

  /**
   * `SELECT pays, COUNT(*) ... GROUP BY pays` for one entity, returned as a
   * `pays -> count` map. `applyExtra` lets callers add predicates (e.g.
   * excluding admins from the user count). Fully parameterised.
   */
  private async groupByCountry<T extends ObjectLiteral>(
    repo: Repository<T>,
    applyExtra?: (qb: SelectQueryBuilder<T>) => void,
  ): Promise<Map<string, number>> {
    const qb = repo
      .createQueryBuilder('e')
      .select('e.pays', 'pays')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.pays');
    if (applyExtra) applyExtra(qb);
    const rows: Array<{ pays: string; count: string }> = await qb.getRawMany();
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.pays, Number(row.count));
    return map;
  }

  /**
   * Builds a totals object either for one country (`country = '<slug>'`) or
   * as a grand total across all countries (`country = null`). Mirrors the
   * scoped-path shape, including the `epreuvesCount = épreuves + concours`
   * convention.
   */
  private assembleTotals(maps: EntityMaps, country: string | null): StatsTotals {
    const sum = (m: Map<string, number>): number =>
      country === null
        ? [...m.values()].reduce((a, b) => a + b, 0)
        : m.get(country) ?? 0;

    const epreuvesCount = sum(maps.epreuves);
    const concoursCount = sum(maps.concours);

    return {
      usersCount: sum(maps.users),
      etablissementsCount: sum(maps.etablissements),
      filieresCount: sum(maps.filieres),
      matieresCount: sum(maps.matieres),
      epreuvesCount: epreuvesCount + concoursCount,
      publicitesCount: sum(maps.publicites),
      evenementsCount: sum(maps.evenements),
      opportunitesCount: sum(maps.opportunites),
      concoursCount,
      contactsProfessionnelsCount: sum(maps.contactsProfessionnels),
      parcoursCount: sum(maps.parcours),
      categoriesCount: sum(maps.categories),
    };
  }
}

export interface StatsTotals {
  usersCount: number;
  etablissementsCount: number;
  filieresCount: number;
  matieresCount: number;
  epreuvesCount: number;
  publicitesCount: number;
  evenementsCount: number;
  opportunitesCount: number;
  concoursCount: number;
  contactsProfessionnelsCount: number;
  parcoursCount: number;
  categoriesCount: number;
}

export interface CountryStats extends StatsTotals {
  pays: string;
}

export type StatsResponse = StatsTotals & { par_pays?: CountryStats[] };

interface EntityMaps {
  users: Map<string, number>;
  etablissements: Map<string, number>;
  filieres: Map<string, number>;
  matieres: Map<string, number>;
  epreuves: Map<string, number>;
  publicites: Map<string, number>;
  evenements: Map<string, number>;
  opportunites: Map<string, number>;
  concours: Map<string, number>;
  contactsProfessionnels: Map<string, number>;
  parcours: Map<string, number>;
  categories: Map<string, number>;
}