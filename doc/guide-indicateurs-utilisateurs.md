# Page « Utilisateurs → Indicateurs » — guide de lecture

Cette page est celle du **rapport bailleur**. Elle répond à une seule question :
**que s'est-il passé entre deux dates ?** Chaque chiffre est recalculé selon la
période choisie et selon le pays sélectionné en haut à droite.

Ce guide donne, pour chaque carte de l'écran, ce qu'elle mesure exactement, et
les quelques endroits où l'affichage peut induire en erreur.

---

## 1. La période, d'abord

Rien sur cette page n'est un cumul historique. Tout dépend des deux dates.

- Raccourcis disponibles : **7 j**, **30 j**, **6 mois**, **12 mois**, ou des dates personnalisées.
- La **date de fin est incluse en entier**, jusqu'à 23 h 59.
- Les journées sont celles du **pays**, pas du serveur : une inscription à 00 h 30 à Cotonou compte pour le bon jour.

> Deux périodes différentes ne sont jamais comparables directement : « 7 j »
> compte une semaine d'inscriptions, « 12 mois » en compte 52 fois plus. Pour
> comparer, il faut comparer des durées égales.

---

## 2. D'où viennent les chiffres

Aucun indicateur n'est saisi à la main : tous sont **recomptés à chaque
affichage** à partir de trois registres que l'application alimente toute seule.

| Registre | Ce qu'il contient | Ce qu'il sert à mesurer |
|---|---|---|
| **Le carnet des comptes** | Une ligne par personne inscrite, avec ce qu'elle a déclaré à l'inscription : rôle, sexe, tranche d'âge, zone de résidence, situation de handicap | Les inscriptions et toutes les répartitions |
| **Le journal des connexions** | Une ligne à chaque ouverture ou reprise de session, depuis le 11 août 2026 | Les indicateurs « connectés » |
| **Le journal des consultations** | Une ligne à chaque ouverture d'une épreuve ou d'un concours | Les « apprenants actifs » |

### La recette est toujours la même

Chaque indicateur se construit en trois gestes :

1. **On choisit un registre** — comptes, connexions ou consultations.
2. **On filtre** — on ne garde que les lignes du pays sélectionné, et celles qui tombent entre les deux dates.
3. **On compte** — soit toutes les lignes restantes, soit seulement celles qui portent une caractéristique (femme, zone rurale, etc.).

**Une personne n'est jamais comptée deux fois.** Quelqu'un qui se connecte dix
fois dans le mois compte pour **un** dans « Utilisateurs connectés ». Quelqu'un
qui ouvre quinze épreuves compte pour **un** dans « Apprenants actifs ».

### Deux précisions qui changent la lecture

- **La tranche d'âge est déclarée, pas calculée.** L'application ne connaît pas la date de naissance : elle utilise la tranche que la personne a choisie en s'inscrivant. Qui n'a rien choisi n'apparaît dans aucune tranche.
- **Les inscriptions sont datées du jour de création du compte.** Un compte créé il y a deux ans n'entrera jamais dans les inscriptions d'un mois récent, même si la personne est très active aujourd'hui.

> **Le journal des connexions démarre le 11 août 2026.** Avant cette date, les
> indicateurs « connectés » affichent **0** : ce n'est pas une chute d'activité,
> c'est l'absence de mesure. Ils comptaient jusque-là une donnée qui ne
> convenait pas — voir la section 10 — et l'historique réel n'est pas
> reconstituable.

---

## 3. Le bandeau du haut

Quatre chiffres de synthèse, repris en détail plus bas.

| Tuile | Ce qu'elle donne |
|---|---|
| **Utilisateurs inscrits** | Comptes créés pendant la période, tous rôles |
| **Apprenants inscrits** | Parmi eux, ceux dont le rôle est « étudiant » |
| **Utilisateurs connectés** | Comptes s'étant connectés au moins une fois pendant la période |
| **Apprenants actifs** | Apprenants ayant consulté une épreuve ou un concours sur les 30 derniers jours |

Attention : les deux premières tuiles parlent d'**inscriptions**, les deux
suivantes d'**activité**. Ce ne sont pas les mêmes personnes, et il ne faut pas
les soustraire l'une de l'autre.

---

## 4. Section « Utilisateurs »

Sous-titre à l'écran : « Population totale inscrite sur la période ». Sept
cartes, toutes portant sur les comptes **créés pendant la période**, tous rôles
confondus (administrateurs compris).

| Carte | Définition exacte |
|---|---|
| **Total inscrits** | Nombre de comptes créés sur la période |
| **Âgés de 35 ans ou moins** | Tranche d'âge déclarée « < 18 », « 18 - 25 » ou « 26 - 35 » |
| **Femmes** | Sexe déclaré « F » |
| **Femmes de 35 ans ou moins** | Les deux critères ci-dessus à la fois |
| **En zone rurale** | Zone de résidence déclarée « rural » |
| **En situation de handicap** | Case handicap cochée sur le profil |
| **Connectés sur la période** | Comptes distincts ayant ouvert ou repris au moins une session |

Chaque carte affiche aussi un pourcentage, appelé **part du total** : la carte
divisée par « Total inscrits ».

---

## 5. Section « Apprenants »

Sous-titre : « Inscription — utilisateurs au rôle étudiant ». Les mêmes
découpages, restreints aux comptes de rôle **étudiant**, et rapportés au total
des apprenants inscrits.

Cartes : **Apprenants inscrits**, **Âgés de 35 ans ou moins**, **Femmes de
35 ans ou moins**, **Femmes**, **En zone rurale**, **En situation de handicap**.

C'est la section à citer pour parler du public cible : elle exclut les
administrateurs, les professeurs et les autres rôles.

---

## 6. Section « Engagement »

Sous-titre : « Connexion & consultation de ressources par les apprenants ».

| Carte | Définition |
|---|---|
| **Apprenants connectés sur la période** | Apprenants distincts ayant ouvert ou repris au moins une session pendant la période |
| **Dernière semaine** | Apprenants distincts ayant consulté une épreuve ou un concours sur les 7 derniers jours |
| **Dernières 2 semaines** | Idem sur 14 jours |
| **Dernier mois** | Idem sur 30 jours |

**Se connecter et consulter ne sont pas la même chose.** « Connectés » compte
l'ouverture de l'application ; « Dernière semaine » compte l'ouverture effective
d'un contenu. Le second est la mesure d'usage réel.

> Les trois fenêtres 7 / 14 / 30 jours **ne suivent pas la période choisie**.
> Elles regardent toujours en arrière depuis la **date de fin**. Si la période
> couvre 12 mois et se termine aujourd'hui, « Dernière semaine » signifie bien
> les sept derniers jours, pas l'année.

---

## 7. Comment lire les pourcentages

Les pourcentages des sections Utilisateurs et Apprenants se lisent sans piège :
ils rapportent une sous-population à son total, sur la même période. « Femmes
40 % » signifie que 40 % des personnes inscrites sur la période sont des femmes.

**Une exception importante : le « taux de connexion ».** Il divise les comptes
connectés pendant la période par les comptes **inscrits** pendant la période.
Or les personnes connectées ne sont pas forcément inscrites sur cette période :
un compte créé l'an dernier qui se connecte aujourd'hui est compté au numérateur
mais pas au dénominateur.

Mesure faite sur les données du Bénin le 11 août 2026, avant le correctif de
la section 10 :

| Période | Inscrits | Connectés | Taux affiché |
|---|---|---|---|
| 7 jours | 98 | 169 | **172 %** |
| 30 jours | 4 499 | 820 | 18 % |
| 6 mois | 23 907 | 12 012 | 50 % |

Sur une période courte, le taux peut donc **dépasser 100 %**. Ce n'est pas une
anomalie de données : le numérateur et le dénominateur ne portent pas sur la
même population. En présentation, citer les deux nombres bruts — « 169 comptes
connectés, 98 nouvelles inscriptions » — plutôt que ce pourcentage.

Le correctif du 11 août change les valeurs de ce tableau mais pas le
raisonnement : le dénominateur reste « les inscrits de la période », donc le
rapport garde le même défaut.

---

## 8. Ce que les chiffres ne disent pas

1. **Les âges non renseignés ne sont comptés dans aucune tranche.** Un compte sans tranche d'âge n'apparaît ni dans « 35 ans ou moins », ni ailleurs : la somme des tranches est donc inférieure au total.
2. **Il en va de même pour le sexe, la zone et le handicap.** Ces cartes comptent des déclarations, pas des faits : un champ vide est un « non » silencieux, et fait baisser mécaniquement le pourcentage.
3. **La section Utilisateurs inclut les administrateurs.** Pour le public réel, utiliser la section Apprenants.
4. **« Connectés » compte des sessions, pas du temps passé** ni du contenu consulté. Une session reprise sans ressaisie du mot de passe compte comme une ouverture : l'indicateur mesure la présence, pas la ré-authentification.
5. **Tous les chiffres dépendent du pays sélectionné.** Un indicateur cité sans le pays n'a pas de sens.
6. **Une inscription n'est jamais retirée rétroactivement.** Un compte supprimé plus tard reste absent des périodes futures mais ne modifie pas le passé affiché.

---

## 9. Fiche de calcul, indicateur par indicateur

Pour chaque indicateur : le registre utilisé, ce qu'on garde, ce qu'on compte.
Partout, seules les lignes du **pays sélectionné** sont prises.

| Indicateur | Registre | On garde | On compte |
|---|---|---|---|
| Utilisateurs inscrits | Comptes | Comptes créés entre les deux dates | Toutes les lignes |
| Âgés de 35 ans ou moins | Comptes | Idem, tranche déclarée sous 35 ans | Toutes les lignes restantes |
| Femmes | Comptes | Idem, sexe déclaré « F » | Toutes les lignes restantes |
| Femmes de 35 ans ou moins | Comptes | Idem, les deux critères ensemble | Toutes les lignes restantes |
| En zone rurale | Comptes | Idem, zone déclarée « rural » | Toutes les lignes restantes |
| En situation de handicap | Comptes | Idem, case handicap cochée | Toutes les lignes restantes |
| Utilisateurs connectés | Connexions | Sessions ouvertes ou reprises entre les deux dates | Les personnes, chacune une fois |
| Apprenants inscrits | Comptes | Comptes créés entre les deux dates, rôle étudiant | Toutes les lignes restantes |
| Répartitions apprenants | Comptes | Idem + le critère de la carte | Toutes les lignes restantes |
| Apprenants connectés | Connexions | Sessions ouvertes ou reprises entre les deux dates, personne de rôle étudiant | Les personnes, chacune une fois |
| Apprenants actifs 7 / 14 / 30 j | Consultations | Épreuves et concours ouverts dans les 7, 14 ou 30 jours précédant la date de fin, par un étudiant | Les personnes, chacune une fois |

### Trois exemples lus à voix haute

- **« Femmes de 35 ans ou moins » = 120.** On a pris le carnet des comptes, gardé ceux du Bénin créés entre le 1er et le 31 janvier, puis ceux à la fois déclarés « F » et dans une tranche sous 35 ans. Il en restait 120.
- **« Utilisateurs connectés » = 820.** On a pris le journal des connexions, gardé les sessions ouvertes ou reprises en janvier par des comptes du Bénin, puis compté les personnes distinctes : 820, quel que soit leur nombre de passages et leur date d'inscription.
- **« Apprenants actifs, dernier mois » = 340.** On a pris le journal des consultations, gardé les ouvertures d'épreuves et de concours des 30 jours précédant le 31 janvier, faites par des étudiants, puis compté les personnes distinctes : 340.

---

## 10. Deux limites connues, à dire avant qu'on les découvre

### Les indicateurs « connectés » ont changé de source le 11 août 2026

Ils comptaient jusque-là des lignes de la table des jetons de connexion. Or
cette table ne conserve **qu'une ligne par compte** : à chaque connexion,
l'ancienne est supprimée et remplacée. Elle ne portait donc que la **dernière**
connexion de chaque personne — 18 246 comptes sur 18 249 n'avaient qu'une seule
ligne.

Deux conséquences, désormais corrigées :

- une personne revenant chaque semaine n'était comptée que dans la période de sa dernière visite, si bien que la fidélité était invisible ;
- le même rapport rejoué plus tard donnait un chiffre différent pour un mois passé, la ligne s'étant déplacée entre-temps.

Depuis le 11 août 2026, chaque connexion réussie écrit sa propre ligne dans un
journal qui n'est ni modifié ni purgé. Les chiffres sont donc justes et
reproductibles à partir de cette date — et valent **0** avant.

**Le journal enregistre aussi les sessions reprises**, et il fallait cela pour
que le compte soit honnête. L'application ne redemande le mot de passe qu'après
une réinstallation, une déconnexion volontaire ou trente jours d'absence : une
personne qui l'ouvre tous les jours ne se « reconnecte » presque jamais. Ne
compter que les mots de passe saisis aurait rendu invisibles les utilisateurs
les plus assidus. Une reprise de session est donc journalisée comme une
connexion, et une personne revenue vingt fois dans le mois compte toujours pour
une seule.

### Trois répartitions sont exactes mais presque vides

Elles ne sont pas mal calculées : les informations ne sont pas collectées à
l'inscription. Relevé sur le Bénin le 11 août 2026, sur 32 594 comptes :

| Carte | Renseigné | Ce que la carte affiche en réalité |
|---|---|---|
| **En zone rurale** | 1 compte, et il est « urbain » | Toujours 0 |
| **En situation de handicap** | 1 compte à « oui » | Toujours 1 |
| **Âgés de 35 ans ou moins** | 370 comptes (1,1 %) | Une part de ce 1,1 %, pas de la population |

Présenter « 0 utilisateur en zone rurale » ou « 1,1 % de moins de 35 ans »
comme un constat sur le public serait faux : ces cartes décrivent un champ de
formulaire vide, pas les personnes. Tant que ces informations ne sont pas
demandées à l'inscription, mieux vaut ne pas les citer.
