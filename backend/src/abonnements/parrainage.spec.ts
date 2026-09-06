import { ParrainageService } from './parrainage.service';
import { RewardSourceTypeCode, WalletStatus } from '../wallet/shared/payment.enums';

const abonnement = (surcharges: any = {}) => ({
  id: 1,
  uuid: 'abo-1',
  utilisateur_id: 10,
  parrain_id: 20,
  montant_paye: 2000,
  commission_versee: false,
  plan: { code: 'MENSUEL' },
  ...surcharges,
});

describe('ParrainageService', () => {
  let abonnements: any, utilisateurs: any, dataSource: any, credit: any, service: ParrainageService;

  beforeEach(() => {
    abonnements = { update: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0), find: jest.fn().mockResolvedValue([]) };
    utilisateurs = {
      findOne: jest.fn().mockResolvedValue({ id: 20, est_desactive: false }),
      find: jest.fn().mockResolvedValue([]),
    };
    // Aucun wallet trouvé = wallet à créer, pas un wallet bloqué.
    dataSource = { query: jest.fn().mockResolvedValue([]) };
    credit = { execute: jest.fn().mockResolvedValue({ duplicated: false }) };
    // `moduleRef.get` remplace l'injection directe : le use-case est résolu
    // au moment de l'appel pour ne pas fermer un cycle de modules.
    service = new ParrainageService(abonnements, utilisateurs, dataSource, { get: () => credit } as any);
  });

  describe('versement', () => {
    it('crédite le parrain sur l’identifiant de l’ABONNEMENT', async () => {
      const r = await service.verserCommission(abonnement() as any);

      expect(r.verse).toBe(true);
      const commande = credit.execute.mock.calls[0][0];
      expect(commande).toMatchObject({
        userId: 20,
        sourceType: RewardSourceTypeCode.PARRAINAGE_ABONNEMENT,
        // Le piège de l'issue : avec l'id du filleul (10) ou du parrain (20),
        // la déduplication (wallet, sourceType, sourceId) du use-case avalerait
        // silencieusement le second parrainage.
        sourceId: 'abo-1',
        baseAmount: 2000,
      });
      expect(commande.sourceId).not.toBe('10');
      expect(commande.sourceId).not.toBe('20');
    });

    it('crédite DEUX fois un parrain pour deux filleuls différents', async () => {
      await service.verserCommission(abonnement({ id: 1, uuid: 'abo-1', utilisateur_id: 10 }) as any);
      await service.verserCommission(abonnement({ id: 2, uuid: 'abo-2', utilisateur_id: 11 }) as any);

      const ids = credit.execute.mock.calls.map((c: any[]) => c[0].sourceId);
      expect(ids).toEqual(['abo-1', 'abo-2']);
      expect(new Set(ids).size).toBe(2);
    });

    it('marque la commission comme versée', async () => {
      await service.verserCommission(abonnement() as any);
      expect(abonnements.update).toHaveBeenCalledWith(1, { commission_versee: true });
    });

    it('transmet le montant payé comme base du pourcentage', async () => {
      await service.verserCommission(abonnement({ montant_paye: 18000 }) as any);
      expect(credit.execute.mock.calls[0][0].baseAmount).toBe(18000);
    });
  });

  describe('refus', () => {
    it.each([
      ['sans parrain', { parrain_id: null }, 'AUCUN_PARRAIN'],
      ['commission déjà versée', { commission_versee: true }, 'DEJA_VERSEE'],
      ['auto-parrainage', { parrain_id: 10 }, 'AUTO_PARRAINAGE'],
    ])('refuse %s', async (_titre, surcharges, motif) => {
      const r = await service.verserCommission(abonnement(surcharges) as any);
      expect(r).toMatchObject({ verse: false, motif });
      expect(credit.execute).not.toHaveBeenCalled();
    });

    it('refuse un parrain désactivé', async () => {
      utilisateurs.findOne.mockResolvedValue({ id: 20, est_desactive: true });
      const r = await service.verserCommission(abonnement() as any);
      expect(r).toMatchObject({ verse: false, motif: 'PARRAIN_DESACTIVE' });
      expect(credit.execute).not.toHaveBeenCalled();
    });

    it('refuse un wallet bloqué — créditer produirait une ligne non retirable', async () => {
      dataSource.query.mockResolvedValue([{ status: WalletStatus.BLOCKED }]);
      const r = await service.verserCommission(abonnement() as any);
      expect(r).toMatchObject({ verse: false, motif: 'WALLET_INDISPONIBLE' });
    });

    it('n’échoue pas quand le wallet refuse le crédit', async () => {
      // Commission désactivée, taux à zéro, plafond atteint : le versement
      // échoue mais l'activation de l'abonnement, elle, doit tenir.
      credit.execute.mockRejectedValue(new Error('La récompense du type PARRAINAGE_ABONNEMENT est désactivée'));
      await expect(service.verserCommission(abonnement() as any)).resolves.toMatchObject({ verse: false });
      // Non marqué versé : l'abonnement reste rattrapable.
      expect(abonnements.update).not.toHaveBeenCalled();
    });

    it('reste rattrapable après un échec, puis réussit', async () => {
      credit.execute.mockRejectedValueOnce(new Error('wallet indisponible'));
      expect((await service.verserCommission(abonnement() as any)).verse).toBe(false);

      credit.execute.mockResolvedValue({ duplicated: false });
      expect((await service.verserCommission(abonnement() as any)).verse).toBe(true);
    });
  });

  describe('résolution du bénéficiaire', () => {
    /** Le premier appel cherche le propriétaire du code, le second le filleul. */
    const avec = ({ proprietaireDuCode, parrainInscription }: any) => {
      utilisateurs.findOne.mockImplementation(async ({ where }: any) =>
        where.mon_code_parrainage !== undefined
          ? proprietaireDuCode
          : { id: 10, parrain: parrainInscription },
      );
    };

    it('retient le parrain d’inscription sans code', async () => {
      avec({ parrainInscription: { id: 20 } });
      expect(await service.resoudreParrain(10)).toBe(20);
    });

    it('LE CODE SAISI PRIME sur le parrain d’inscription', async () => {
      // Celui qui convainc d'acheter n'est pas forcément celui qui avait amené
      // le compte, parfois des mois plus tôt.
      avec({ proprietaireDuCode: { id: 33 }, parrainInscription: { id: 20 } });
      expect(await service.resoudreParrain(10, 'CODE33')).toBe(33);
    });

    it('ne touche PAS à la relation d’inscription', async () => {
      avec({ proprietaireDuCode: { id: 33 }, parrainInscription: { id: 20 } });
      await service.resoudreParrain(10, 'CODE33');
      // Aucune écriture sur utilisateurs : la donnée d'acquisition est
      // immuable, sans quoi une seule vente réattribuerait toutes les
      // commissions futures.
      expect(utilisateurs.save).toBeUndefined();
      expect(utilisateurs.update).toBeUndefined();
    });

    it('normalise le code en majuscules, comme à l’inscription', async () => {
      avec({ proprietaireDuCode: { id: 33 }, parrainInscription: null });
      await service.resoudreParrain(10, ' code33 ');
      expect(utilisateurs.findOne.mock.calls[0][0].where.mon_code_parrainage).toBe('CODE33');
    });

    it('retombe sur le parrain d’inscription si le code est inconnu', async () => {
      avec({ proprietaireDuCode: null, parrainInscription: { id: 20 } });
      expect(await service.resoudreParrain(10, 'INEXISTANT')).toBe(20);
    });

    it('retombe sur le parrain d’inscription si le code est le sien', async () => {
      avec({ proprietaireDuCode: { id: 10 }, parrainInscription: { id: 20 } });
      expect(await service.resoudreParrain(10, 'MONCODE')).toBe(20);
    });

    it('refuse l’auto-parrainage hérité de l’inscription', async () => {
      avec({ parrainInscription: { id: 10 } });
      expect(await service.resoudreParrain(10)).toBeNull();
    });

    it('renvoie null sans code ni parrain', async () => {
      avec({ parrainInscription: null });
      expect(await service.resoudreParrain(10)).toBeNull();
    });
  });
});
