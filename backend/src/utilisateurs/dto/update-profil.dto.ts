import { PickType } from '@nestjs/swagger';
import { MajUtilisateurDto } from './maj-utilisateur.dto';

export class UpdateProfilDto extends PickType(MajUtilisateurDto, [
    'nom',
    'prenom',
    'pseudo',
    'etablissement_id',
    'filiere_id',
    'niveau_etude_id',
    'sexe',
    'telephone',
    'date_naissance',
    'zone_residence',
    'situation_handicap',
] as const) { }
