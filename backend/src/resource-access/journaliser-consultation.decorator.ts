import { applyDecorators, CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata, UseInterceptors } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Observable, tap } from 'rxjs';
import { ResourceAccessService, ResourceType } from './resource-access.service';

export const CLE_CONSULTATION = 'consultation:resource_type';

/**
 * Journalise la consultation d'une fiche de module, pour la section
 * « Audience » des indicateurs (#260).
 *
 * Un intercepteur plutôt qu'un appel dans chaque contrôleur : les sept modules
 * concernés ont des signatures différentes (identifiant en `string` ici, en
 * `number` là, pays injecté ou non), et sept variantes du même appel seraient
 * sept occasions de diverger. Ici la règle est écrite une fois.
 *
 * On journalise APRÈS la réponse, et seulement si elle a abouti : une fiche
 * introuvable n'est pas une consultation. L'écriture reste au mieux — le
 * service avale ses erreurs, la lecture n'échoue jamais à cause du journal.
 */
@Injectable()
export class ConsultationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly acces: ResourceAccessService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Qui consulte, quand la route ne l'exige pas.
   *
   * Certaines fiches sont publiques — `GET /offres/:id` n'a aucune garde — et
   * `req.user` y reste vide même lorsqu'un jeton valide accompagne la requête.
   * Sans ce décodage opportuniste, le compte d'« utilisateurs distincts » de
   * ces modules resterait à zéro pour toujours. On ne refuse jamais : un jeton
   * absent, expiré ou illisible donne simplement une consultation anonyme.
   */
  private utilisateur(req: any): number | null {
    if (req.user?.utilisateurId) return req.user.utilisateurId;
    const jeton = req.headers?.authorization?.split(' ')[1];
    if (!jeton) return null;
    try {
      return this.jwt.verify(jeton)?.sub ?? null;
    } catch {
      return null;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = this.reflector.get<ResourceType>(CLE_CONSULTATION, context.getHandler());
    if (!type) return next.handle();

    const req = context.switchToHttp().getRequest();
    const id = Number(req.params?.id);
    // Certaines routes acceptent un uuid : l'identifiant numérique du journal
    // n'aurait alors aucun sens, on s'abstient plutôt que d'inventer un 0.
    if (!Number.isFinite(id)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        void this.acces.log(type, id, this.utilisateur(req), req.country ?? 'benin');
      }),
    );
  }
}

/** Pose sur une route de détail : `@JournaliserConsultation('opportunite')`. */
export const JournaliserConsultation = (type: ResourceType) =>
  applyDecorators(SetMetadata(CLE_CONSULTATION, type), UseInterceptors(ConsultationInterceptor));
