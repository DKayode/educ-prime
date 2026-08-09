import { RoleType, Utilisateur } from '../utilisateurs/entities/utilisateur.entity';

/**
 * `epreuves.professeur_id` est NOT NULL et reçoit l'AUTEUR du dépôt : à
 * l'approbation d'une soumission c'est l'ÉTUDIANT qui a chargé le PDF
 * (epreuve-submissions.service.ts). En production ce champ contient 2 705
 * admins, 387 étudiants, 20 « autre » — et 1 seul vrai professeur ; la réponse
 * publiait leur `telephone` sur chaque liste d'épreuves.
 *
 * Le lien reste en base (audit du dépôt, récompense wallet) mais n'est exposé
 * que s'il s'agit réellement d'un professeur. La clé `professeur` est conservée
 * dans la réponse, à `null` sinon : les clients qui l'affichent n'ont rien à
 * changer, ils cessent simplement de montrer un élève comme enseignant.
 */
export function professeurPublic(
  utilisateur?: Utilisateur | null,
): { nom: string; prenom: string; telephone: string } | null {
  if (!utilisateur || utilisateur.role !== RoleType.PROFESSEUR) return null;
  return {
    nom: utilisateur.nom,
    prenom: utilisateur.prenom,
    telephone: utilisateur.telephone,
  };
}
