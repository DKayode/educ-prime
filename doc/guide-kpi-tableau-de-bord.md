# Les indicateurs du tableau de bord Edukia

Ce document explique **ce que mesure chaque chiffre** de la console
d'administration, **comment il est calculé** et **ce qu'il ne compte pas**. Il
s'adresse aux personnes qui présentent ou interprètent ces chiffres, pas
seulement à l'équipe technique.

Trois écrans affichent des indicateurs, et ils ne répondent pas à la même
question :

| Écran | Question | Période |
|---|---|---|
| **Tableau de bord** | Que contient la plateforme aujourd'hui ? | Aucune — cumul depuis le début |
| **Indicateurs** | Que s'est-il passé entre deux dates ? | Période choisie |
| **Statistiques (Approbations)** | Où en est la file de validation ? | Période choisie |

> **Règle commune : tout est filtré par pays.** Le sélecteur en haut à droite
> (Bénin, Sénégal, Congo) s'applique à tous les chiffres. Changer de pays change
> tous les indicateurs. Le tableau de bord possède en plus une option « tous les
> pays ».

---

## 1. Tableau de bord

Photographie de l'existant, **sans notion de période** : ces nombres ne
descendent jamais, sauf suppression de contenu.

| Carte | Ce qui est compté |
|---|---|
| **Utilisateurs** | Comptes du pays, **hors administrateurs** |
| **Établissements** | Établissements enregistrés |
| **Épreuves** | Épreuves publiées |
| **Concours** | Concours publiés |

Les répartitions affichées en dessous (filières, matières, niveaux d'étude,
publicités, événements, opportunités, contacts professionnels, parcours,
catégories) suivent la même logique : un comptage total, par pays.

**Deux points à connaître avant de citer ces chiffres :**

- **Les administrateurs sont exclus** du compteur « Utilisateurs ». Il représente donc le public réel, pas les comptes internes.
- **Les examens nationaux ne sont comptés nulle part.** La carte « Épreuves » ne compte que la table des épreuves ; les examens nationaux sont une ressource distincte, récente, et n'apparaissent dans aucune carte.

---

## 2. Indicateurs

Cet écran est celui du **rapport bailleur** (Mastercard Foundation). Chaque
chiffre est calculé **sur la période choisie** (raccourcis 7 j, 30 j, 6 mois,
12 mois, ou dates personnalisées).

### Conventions de calcul

Ces définitions valent pour tout l'écran :

| Terme | Définition technique |
|---|---|
| **Apprenant** | Compte dont le rôle est « étudiant » |
| **Femme** | Sexe renseigné à « F » |
| **35 ans ou moins** | Tranche d'âge « < 18 », « 18 - 25 » ou « 26 - 35 » |
| **Zone rurale** | Zone de résidence renseignée à « rural » |
| **Situation de handicap** | Case correspondante cochée sur le profil |
| **Connecté** | A ouvert au moins une session sur la période |
| **Inscrit sur la période** | Compte **créé** entre les deux dates |

> **Le jour est celui du pays, pas celui du serveur.** Une inscription à 00 h 30
> à Cotonou compte pour le bon jour, et non pour la veille. Les bornes de la
> période sont converties dans le fuseau du pays, et la date de fin est incluse
> en entier.

### Section « Utilisateurs »

Toutes ces valeurs portent sur les comptes **créés pendant la période**, tous
rôles confondus.

| Indicateur | Signification |
|---|---|
| **Total inscrits** | Nouveaux comptes sur la période |
| **Âgés de 35 ans ou moins** | Parmi eux, ceux dont la tranche d'âge est sous 35 ans |
| **Femmes** | Parmi eux, celles dont le sexe est « F » |
| **Femmes de 35 ans ou moins** | Croisement des deux critères précédents |
| **En zone rurale** | Parmi eux, ceux déclarés en zone rurale |
| **En situation de handicap** | Parmi eux, ceux ayant déclaré un handicap |
| **Connectés sur la période** | Comptes distincts s'étant connectés, quelle que soit leur date d'inscription |

### Section « Apprenants »

Mêmes indicateurs, restreints aux comptes de rôle « étudiant » : total, 35 ans
ou moins, femmes, femmes de 35 ans ou moins, zone rurale, situation de handicap.

### Section « Engagement »

| Indicateur | Signification |
|---|---|
| **Apprenants connectés** | Apprenants distincts s'étant connectés sur la période |
| **Apprenants ayant consulté une ressource** | Apprenants distincts ayant ouvert une épreuve ou un concours, sur les **7 derniers jours**, **14 derniers jours** et **30 derniers jours** |

> Attention à ces trois dernières valeurs : elles ne suivent **pas** la période
> choisie. Elles regardent toujours en arrière depuis la **date de fin**
> sélectionnée. Avec une période de 12 mois se terminant aujourd'hui,
> « 7 derniers jours » signifie bien les 7 derniers jours, pas l'année.

---

## 3. Statistiques des approbations

Suivi de la file de validation des contenus déposés par les utilisateurs, avec
un bloc par ressource : **Épreuves** et **Concours**.

| Statut | Signification |
|---|---|
| **En attente** | Déposée, pas encore traitée par un administrateur |
| **Approuvées** | Validées et publiées |
| **Refusées** | Rejetées, avec un motif communiqué à l'auteur |
| **À compléter** | Sous-ensemble des « en attente » : l'auteur a saisi un nom libre au lieu de choisir dans les listes existantes |

**« À compléter » est le chiffre le plus utile au quotidien.** Une soumission
tombe dans cette catégorie quand l'auteur a écrit, par exemple, un nom
d'établissement ou de matière qui n'existe pas encore dans la base. Elle ne peut
pas être approuvée telle quelle : un administrateur doit d'abord rattacher ce
nom à une entrée réelle, ou créer l'entrée. Un chiffre qui monte signale du
travail de nettoyage en attente, pas un problème de qualité des dépôts.

La courbe affichée sous les compteurs regroupe les dépôts par jour, semaine ou
mois selon la longueur de la période choisie.

> **Les examens nationaux ne figurent pas sur cet écran.** Leur file
> d'approbation existe et fonctionne, mais elle n'est pas encore comptabilisée
> ici. Seules les épreuves et les concours sont suivis.

---

## 4. Sept pièges de lecture

1. **Tableau de bord et Indicateurs ne se recoupent pas.** Le premier cumule depuis le début, le second ne regarde qu'une période. Le total d'utilisateurs du tableau de bord sera toujours supérieur aux inscrits d'un mois donné.
2. **Le tableau de bord exclut les administrateurs, les Indicateurs non.** Un écart de quelques unités entre les deux écrans vient normalement de là.
3. **« Connectés » compte des connexions, pas de l'usage.** Un compte qui ouvre l'application sans rien consulter est compté. Pour l'usage réel, lire « apprenants ayant consulté une ressource ».
4. **Les âges non renseignés ne sont comptés nulle part.** Un compte sans tranche d'âge n'entre ni dans « 35 ans ou moins », ni dans un quelconque groupe d'âge. La somme des tranches peut donc être inférieure au total.
5. **Les fenêtres 7 / 14 / 30 jours ignorent la période choisie.** Elles partent toujours de la date de fin.
6. **Les examens nationaux sont absents de tous les compteurs**, tableau de bord comme statistiques d'approbation.
7. **Tout dépend du pays sélectionné.** Un chiffre présenté sans préciser le pays n'a pas de sens.

---

## 5. Récapitulatif

| Écran | Source | Portée | Usage |
|---|---|---|---|
| Tableau de bord | Comptages directs | Cumul, par pays | « Où en est la plateforme ? » |
| Indicateurs | Inscriptions, connexions, consultations | Période, par pays | Rapport bailleur |
| Statistiques Approbations | Files de soumission | Période, par pays | Pilotage de la modération |
