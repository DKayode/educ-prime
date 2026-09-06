import { QuotaService, QUOTA_KETSIA_GRATUIT, QUOTA_RESSOURCES_GRATUITES } from './quota.service';
import { FeatureQuota } from './entities/quota-consommation.entity';
import { EntitlementService, Feature } from './entitlement.service';
import { RoleType } from '../utilisateurs/entities/utilisateur.entity';

/**
 * Dépôt en mémoire respectant l'unicité (utilisateur, feature, type, id) —
 * c'est elle qui porte la correction du quota, la simuler est donc le cœur du
 * test.
 */
const depotEnMemoire = () => {
  const lignes: any[] = [];
  const cle = (l: any) => `${l.utilisateur_id}|${l.feature}|${l.resource_type}|${l.resource_id}`;
  return {
    lignes,
    count: jest.fn(async ({ where }: any) =>
      lignes.filter((l) => l.utilisateur_id === where.utilisateur_id && l.feature === where.feature).length),
    findOne: jest.fn(async ({ where }: any) =>
      lignes.find((l) => cle(l) === cle(where)) ?? null),
    find: jest.fn(async ({ where }: any) =>
      lignes.filter((l) =>
        l.utilisateur_id === where.utilisateur_id &&
        l.feature === where.feature &&
        l.resource_type === where.resource_type)),
    insert: jest.fn(async (l: any) => {
      if (lignes.some((x) => cle(x) === cle(l))) {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }
      lignes.push(l);
      return { identifiers: [] };
    }),
  };
};

describe('QuotaService', () => {
  let depot: ReturnType<typeof depotEnMemoire>;
  let service: QuotaService;
  const consommer = (id: number, type: any = 'epreuve', feature = FeatureQuota.RESOURCE_VIEW) =>
    service.consommer(1, feature, type, id, 'benin');

  beforeEach(() => {
    depot = depotEnMemoire();
    service = new QuotaService(depot as any);
  });

  it('accorde les 5 premières ressources distinctes', async () => {
    for (let i = 1; i <= QUOTA_RESSOURCES_GRATUITES; i++) {
      const r = await consommer(i);
      expect(r).toMatchObject({ allowed: true, nouveau: true, used: i });
    }
  });

  it('refuse la 6ᵉ ressource distincte', async () => {
    for (let i = 1; i <= 5; i++) await consommer(i);
    const r = await consommer(6);
    expect(r).toMatchObject({ allowed: false, used: 5, limit: 5 });
  });

  it('ne recompte pas une ressource déjà consultée', async () => {
    await consommer(1);
    const r = await consommer(1);
    expect(r).toMatchObject({ allowed: true, nouveau: false, used: 1 });
  });

  it('laisse rouvrir une ressource déjà vue même quota épuisé', async () => {
    for (let i = 1; i <= 5; i++) await consommer(i);
    const r = await consommer(3);
    expect(r).toMatchObject({ allowed: true, nouveau: false });
  });

  it('partage le pool entre épreuves et examens nationaux', async () => {
    await consommer(1, 'epreuve');
    await consommer(2, 'epreuve');
    await consommer(1, 'examen_national');
    await consommer(2, 'examen_national');
    await consommer(3, 'examen_national');
    // 5 consommées, toutes features confondues : la suivante doit tomber.
    expect(await consommer(9, 'epreuve')).toMatchObject({ allowed: false, used: 5 });
  });

  it('distingue une épreuve et un examen national de même identifiant', async () => {
    await consommer(7, 'epreuve');
    const r = await consommer(7, 'examen_national');
    expect(r).toMatchObject({ allowed: true, nouveau: true, used: 2 });
  });

  it('tient son propre plafond pour Ketsia', async () => {
    expect(await consommer(1, 'epreuve', FeatureQuota.KETSIA_AI))
      .toMatchObject({ allowed: true, used: QUOTA_KETSIA_GRATUIT, limit: 1 });
    expect(await consommer(2, 'epreuve', FeatureQuota.KETSIA_AI))
      .toMatchObject({ allowed: false });
    // Revenir sur la ressource déjà décomptée reste permis.
    expect(await consommer(1, 'epreuve', FeatureQuota.KETSIA_AI))
      .toMatchObject({ allowed: true, nouveau: false });
  });

  it('ne mélange pas les compteurs de deux features', async () => {
    for (let i = 1; i <= 5; i++) await consommer(i);
    expect(await consommer(1, 'epreuve', FeatureQuota.KETSIA_AI)).toMatchObject({ allowed: true });
  });

  it('absorbe une insertion concurrente sans consommer deux unités', async () => {
    // Deux requêtes simultanées sur la MÊME ressource : la seconde tombe sur le
    // conflit d'unicité et doit être autorisée sans rien décompter de plus.
    const [a, b] = await Promise.all([consommer(4), consommer(4)]);
    expect(a.allowed && b.allowed).toBe(true);
    expect(depot.lignes.filter((l) => l.resource_id === 4)).toHaveLength(1);
  });

  it('rend les identifiants consommés pour le drapeau deja_consultee', async () => {
    await consommer(3);
    await consommer(8);
    const set = await service.ressourcesConsommees(1, FeatureQuota.RESOURCE_VIEW, 'epreuve');
    expect([...set].sort()).toEqual([3, 8]);
  });

  it('ne requête pas la base pour un utilisateur anonyme', async () => {
    expect(await service.compter(undefined as any, FeatureQuota.RESOURCE_VIEW)).toBe(0);
    expect((await service.ressourcesConsommees(undefined as any, FeatureQuota.RESOURCE_VIEW, 'epreuve')).size).toBe(0);
    expect(depot.count).not.toHaveBeenCalled();
  });
});

describe('EntitlementService — quotas', () => {
  let abonnements: any, utilisateurs: any, config: any, quotas: QuotaService, service: EntitlementService;

  beforeEach(() => {
    abonnements = { findOne: jest.fn().mockResolvedValue(null), find: jest.fn().mockResolvedValue([]) };
    utilisateurs = { findOne: jest.fn().mockResolvedValue({ id: 1, role: RoleType.ETUDIANT }) };
    config = { get: jest.fn().mockReturnValue('true') };
    quotas = new QuotaService(depotEnMemoire() as any);
    service = new EntitlementService(abonnements, utilisateurs, config, quotas);
  });

  it('autorise une épreuve sur le quota gratuit', async () => {
    const d = await service.check(1, Feature.EPREUVE_VIEW, RoleType.ETUDIANT);
    expect(d).toMatchObject({ allowed: true, reason: 'FREE_QUOTA', quota: { used: 0, limit: 5 } });
  });

  it('refuse une épreuve quota épuisé', async () => {
    for (let i = 1; i <= 5; i++) await quotas.consommer(1, FeatureQuota.RESOURCE_VIEW, 'epreuve', i, 'benin');
    const d = await service.check(1, Feature.EPREUVE_VIEW, RoleType.ETUDIANT);
    expect(d).toMatchObject({ allowed: false, reason: 'QUOTA_EXCEEDED', quota: { used: 5, limit: 5 } });
  });

  it('n’accorde AUCUN quota gratuit aux concours', async () => {
    const d = await service.check(1, Feature.CONCOURS_DOWNLOAD, RoleType.ETUDIANT);
    expect(d).toMatchObject({ allowed: false, reason: 'SUBSCRIPTION_REQUIRED' });
    expect(d.quota).toBeUndefined();
  });

  it('donne des décisions divergentes selon la feature', async () => {
    for (let i = 1; i <= 5; i++) await quotas.consommer(1, FeatureQuota.RESOURCE_VIEW, 'epreuve', i, 'benin');
    const droits = await service.mesDroits(1, RoleType.ETUDIANT);
    expect(droits[Feature.EPREUVE_VIEW].reason).toBe('QUOTA_EXCEEDED');
    expect(droits[Feature.KETSIA_AI].reason).toBe('FREE_QUOTA');
    expect(droits[Feature.CONCOURS_DOWNLOAD].reason).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('un abonné n’est jamais soumis au quota', async () => {
    abonnements.findOne.mockResolvedValue({ date_fin: new Date(Date.now() + 86400000), plan: { code: 'MENSUEL' } });
    const droits = await service.mesDroits(1, RoleType.ETUDIANT);
    expect(Object.values(droits).every((d: any) => d.reason === 'SUBSCRIBED')).toBe(true);
  });

  it('un admin n’est jamais soumis au quota', async () => {
    const droits = await service.mesDroits(9, RoleType.ADMIN);
    expect(Object.values(droits).every((d: any) => d.reason === 'ADMIN')).toBe(true);
    expect(abonnements.findOne).not.toHaveBeenCalled();
  });
});
