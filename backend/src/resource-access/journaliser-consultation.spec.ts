import { of, throwError } from 'rxjs';
import { CLE_CONSULTATION, ConsultationInterceptor } from './journaliser-consultation.decorator';

describe('ConsultationInterceptor', () => {
  let acces: any, jwt: any, reflector: any, interceptor: ConsultationInterceptor;

  const contexte = (req: any, type?: string) => {
    reflector.get.mockReturnValue(type);
    return {
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
  };

  const executer = (ctx: any, flux = of({ id: 1 })) =>
    new Promise((resolve, reject) =>
      interceptor.intercept(ctx, { handle: () => flux } as any).subscribe({
        next: resolve,
        error: reject,
      }),
    );

  beforeEach(() => {
    acces = { log: jest.fn().mockResolvedValue(undefined) };
    jwt = { verify: jest.fn() };
    reflector = { get: jest.fn() };
    interceptor = new ConsultationInterceptor(reflector, acces, jwt);
  });

  it('journalise la consultation d’une fiche', async () => {
    await executer(contexte({ params: { id: '58' }, user: { utilisateurId: 7 }, country: 'benin' }, 'opportunite'));
    expect(acces.log).toHaveBeenCalledWith('opportunite', 58, 7, 'benin');
  });

  it('ne journalise rien sur une route non décorée', async () => {
    await executer(contexte({ params: { id: '58' } }, undefined));
    expect(acces.log).not.toHaveBeenCalled();
  });

  it('ne journalise rien si la réponse échoue', async () => {
    // Une fiche introuvable n'est pas une consultation.
    await executer(
      contexte({ params: { id: '999' }, country: 'benin' }, 'opportunite'),
      throwError(() => new Error('404')),
    ).catch(() => undefined);
    expect(acces.log).not.toHaveBeenCalled();
  });

  it('s’abstient quand l’identifiant n’est pas numérique', async () => {
    // Certaines routes acceptent un uuid : inventer un 0 polluerait le journal.
    await executer(contexte({ params: { id: 'a1b2-c3d4' }, country: 'benin' }, 'forum'));
    expect(acces.log).not.toHaveBeenCalled();
  });

  describe('fiches publiques', () => {
    it('identifie l’auteur via le jeton quand la route n’a pas de garde', async () => {
      // `GET /offres/:id` est public : sans ce décodage, le compte
      // d'utilisateurs distincts de ce module resterait à zéro pour toujours.
      jwt.verify.mockReturnValue({ sub: 42 });
      await executer(
        contexte({ params: { id: '4' }, headers: { authorization: 'Bearer jeton' }, country: 'benin' }, 'offre'),
      );
      expect(acces.log).toHaveBeenCalledWith('offre', 4, 42, 'benin');
    });

    it('journalise anonymement sans jeton', async () => {
      await executer(contexte({ params: { id: '4' }, headers: {}, country: 'benin' }, 'offre'));
      expect(acces.log).toHaveBeenCalledWith('offre', 4, null, 'benin');
    });

    it('journalise anonymement — et ne refuse pas — sur un jeton invalide', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });
      const reponse = await executer(
        contexte({ params: { id: '4' }, headers: { authorization: 'Bearer faux' }, country: 'benin' }, 'offre'),
      );
      expect(reponse).toEqual({ id: 1 });
      expect(acces.log).toHaveBeenCalledWith('offre', 4, null, 'benin');
    });
  });

  it('retombe sur benin quand le pays n’est pas résolu', async () => {
    await executer(contexte({ params: { id: '4' }, headers: {} }, 'offre'));
    expect(acces.log).toHaveBeenCalledWith('offre', 4, null, 'benin');
  });

  it('expose la clé de métadonnée attendue par le décorateur', () => {
    expect(CLE_CONSULTATION).toBe('consultation:resource_type');
  });
});
